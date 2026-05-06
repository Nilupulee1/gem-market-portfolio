import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';

dotenv.config({ path: path.join(__dirname, '../.env') });

const [, , emailArg, newPasswordArg] = process.argv;

const printUsage = () => {
  console.log('Usage: npm run reset-password -- <email> <newPassword>');
  console.log('Example: npm run reset-password -- admin@gemfolio.com NewPass123!');
};

const main = async () => {
  if (!emailArg || !newPasswordArg) {
    printUsage();
    process.exit(1);
  }

  if (newPasswordArg.length < 6) {
    console.error('❌ Password must be at least 6 characters.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);

    const user = await User.findOne({ email: emailArg.toLowerCase().trim() });
    if (!user) {
      console.error(`❌ User not found for email: ${emailArg}`);
      process.exit(1);
    }

    user.password = newPasswordArg;
    await user.save(); // triggers pre-save hash middleware

    console.log('✅ Password updated successfully.');
    console.log(`👤 User: ${user.email}`);
  } catch (error) {
    console.error('❌ Failed to reset password:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

void main();
