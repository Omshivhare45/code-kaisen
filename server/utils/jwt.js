import jwt from 'jsonwebtoken';

export const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'setu_super_secret_jwt_key_2026',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      ward: user.ward,
      department: user.department,
    },
  });
};
