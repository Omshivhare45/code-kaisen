const PendingReport = require("../models/Pendinreport.model");
const Issue = require("../models/Issue");
const Department = require("../models/Department");
const User = require("../models/User");
const aiService = require("./aiService");

async function downloadWhatsAppMedia(mediaId) {
  // Step 1: Get media URL
  const res = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
  });
  const data = await res.json();
  if (!data.url) throw new Error("Could not fetch media URL");

  // Step 2: Download media buffer
  const mediaRes = await fetch(data.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
  });
  
  const arrayBuffer = await mediaRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = mediaRes.headers.get("content-type");

  return { buffer, mimeType };
}

async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text }
      })
    });
  } catch (err) {
    console.error("Failed to send WhatsApp message:", err);
  }
}

async function processCompleteReport(pendingReport) {
  try {
    // 1. Download the image
    const { buffer, mimeType } = await downloadWhatsAppMedia(pendingReport.photoUrl);

    // 2. Format location
    const area = `Lat: ${pendingReport.coordinates[1]}, Lng: ${pendingReport.coordinates[0]}`;

    // 3. AI Classification
    const aiData = await aiService.classifyWhatsAppIssue(buffer, mimeType, pendingReport.description, area);
    
    // 4. Find/Create generic WhatsApp user
    let reporter = await User.findOne({ email: "whatsapp_bot@bhopal.gov.in" });
    if (!reporter) {
      reporter = await User.create({
        email: "whatsapp_bot@bhopal.gov.in",
        password: "password123",
        fullName: "WhatsApp Citizen",
        role: "citizen"
      });
    }

    // 5. Find assigned department
    let primaryDept = await Department.findOne({ name: aiData.departmentName });
    
    // 6. Create the Issue
    const newIssue = await Issue.create({
      title: aiData.title,
      description: aiData.description,
      category: aiData.category,
      urgencyScore: aiData.urgencyScore,
      area: "Bhopal (WhatsApp)", // Could reverse-geocode here
      location: {
        type: "Point",
        coordinates: pendingReport.coordinates, // [lng, lat]
      },
      primaryDepartment: primaryDept ? primaryDept._id : null,
      reporterId: reporter._id,
      status: "open"
    });

    // 7. Send confirmation back to citizen
    const reply = `✅ Your issue "${aiData.title}" has been successfully registered and assigned to ${aiData.departmentName}. We are on it!`;
    await sendWhatsAppMessage(pendingReport.phone, reply);

    // 8. Clean up pending report
    await PendingReport.deleteOne({ _id: pendingReport._id });
    console.log("Successfully processed WhatsApp report:", newIssue._id);

  } catch (err) {
    console.error("Error processing complete report:", err);
    await sendWhatsAppMessage(pendingReport.phone, "Sorry, there was an error processing your report. Please try again later.");
    await PendingReport.deleteOne({ _id: pendingReport._id });
  }
}

const processMessage = async (body) => {
    try {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (!message) return;

        const phone = message.from;
        let pending = await PendingReport.findOne({ phone });
        if (!pending) {
          pending = new PendingReport({ phone });
        }

        // Handle Text (can be sent alongside image as a caption or standalone)
        if (message.type === "text") {
            pending.description = message.text.body;
        }

        // Handle Image
        if (message.type === "image") {
            pending.photoUrl = message.image.id;
            // Sometimes caption comes with the image
            if (message.image.caption) {
              pending.description = message.image.caption;
            }
        }

        // Handle Location
        if (message.type === "location") {
            pending.coordinates = [message.location.longitude, message.location.latitude];
            pending.address = message.location.address || message.location.name;
        }

        await pending.save();

        // Check if we have both coordinates and an image ID
        if (pending.coordinates && pending.coordinates.length === 2 && pending.photoUrl) {
            console.log("Both image and location received! Processing report...");
            await sendWhatsAppMessage(phone, "Image and location received! Our AI agent is currently analyzing your report. Please wait a moment...");
            
            // Process async so we don't block the webhook response
            processCompleteReport(pending);
        } else {
            // Give instructions based on what's missing
            if (message.type === "image" && !pending.coordinates) {
              await sendWhatsAppMessage(phone, "Image received. Please share your current location to complete the report.");
            } else if (message.type === "location" && !pending.photoUrl) {
              await sendWhatsAppMessage(phone, "Location received. Please send a photo of the issue to complete the report.");
            }
        }
    } catch (err) {
        console.error("Webhook processing error:", err);
    }
};

module.exports = {
    processMessage
};