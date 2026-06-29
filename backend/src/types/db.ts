export type user_role = 
  | 'Super Admin' 
  | 'Nodal Officer' 
  | 'Department Admin' 
  | 'Department Engineer' 
  | 'Citizen' 
  | 'Read-only Auditor';

export type user_status = 'active' | 'inactive' | 'pending_verification';

export type permit_status = 
  | 'Draft' 
  | 'Submitted' 
  | 'Under Review' 
  | 'Approved' 
  | 'Rejected' 
  | 'Completed';

export type complaint_status = 
  | 'Received' 
  | 'Assigned' 
  | 'In Progress' 
  | 'Resolved' 
  | 'Closed';

export type complaint_type = 
  | 'Pothole' 
  | 'Dust' 
  | 'Blockage' 
  | 'Unsafe trench' 
  | 'Road damage' 
  | 'Illegal digging';
