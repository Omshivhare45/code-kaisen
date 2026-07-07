import jwt from 'jsonwebtoken';
import { toUserDTO } from '../dto/UserDTO.js';

export const sendTokenResponse = (user, statusCode, res) => {
  const roleName = user.role && typeof user.role === 'object' ? user.role.name : user.role;
  const token = jwt.sign(
    { 
      id: user._id,
      role: roleName
    },
    process.env.JWT_SECRET || 'setu_super_secret_jwt_key_2026',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: toUserDTO(user)
  });
};
