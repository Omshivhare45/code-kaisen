import { Router, Response } from 'express';
import { Department } from '../models/Department';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 1. Get all departments
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const depts = await Department.find().sort({ name: 1 });
    return res.status(200).json(depts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Create department (Super Admin or Nodal Officer only)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Nodal Officer')) {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const { name, slug, color } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required.' });
    }

    const existingDept = await Department.findOne({
      $or: [{ name: name.trim() }, { slug: slug.toLowerCase().trim() }],
    });
    if (existingDept) {
      return res.status(400).json({ error: 'Department name or slug already exists.' });
    }

    const newDept = await Department.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      color: color || '#3B82F6',
    });

    return res.status(201).json(newDept);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Update department (Super Admin or Nodal Officer only)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Nodal Officer')) {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const { name, slug, color } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (slug) updateData.slug = slug.toLowerCase().trim();
    if (color) updateData.color = color;

    const updatedDept = await Department.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedDept) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    return res.status(200).json(updatedDept);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
