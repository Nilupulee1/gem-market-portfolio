import 'dotenv/config';
import mongoose from 'mongoose';
import process from 'process';
import { connectDatabase } from '../src/config/database';
import Conversation from '../src/models/Conversation';
import Message from '../src/models/Message';

async function dedupe() {
  await connectDatabase();

  // Find gem-based conversations grouped by seller+buyer+gem
  const pipeline = [
    { $match: { gem: { $exists: true, $ne: null } } },
    { $group: { _id: { seller: '$seller', buyer: '$buyer', gem: '$gem' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ];

  const duplicates = await Conversation.aggregate(pipeline).exec();

  console.log(`Found ${duplicates.length} duplicate groups`);

  for (const group of duplicates) {
    const ids: mongoose.Types.ObjectId[] = group.ids;
    // Keep the earliest created conversation
    const convs = await Conversation.find({ _id: { $in: ids } }).sort({ createdAt: 1 }).exec();
    const keeper = convs[0];
    const toMerge = convs.slice(1);

    console.log(`Merging ${toMerge.length} conversations into ${keeper._id}`);

    for (const c of toMerge) {
      // Move messages
      const res = await Message.updateMany({ conversation: c._id } as any, { $set: { conversation: keeper._id } } as any);
      console.log(`  Moved ${res.modifiedCount} messages from ${c._id}`);

      // Adjust unread counts conservatively
      keeper.unreadCount.sellerUnread = Math.max(keeper.unreadCount.sellerUnread, c.unreadCount.sellerUnread);
      keeper.unreadCount.buyerUnread = Math.max(keeper.unreadCount.buyerUnread, c.unreadCount.buyerUnread);

      // Update lastMessage to the most recent
      if (!keeper.lastMessage || (c.lastMessage && c.updatedAt > keeper.updatedAt)) {
        keeper.lastMessage = c.lastMessage;
      }

      // Delete the duplicate conversation
      await Conversation.deleteOne({ _id: c._id } as any);
      console.log(`  Deleted conversation ${c._id}`);
    }

    await keeper.save();
    console.log(`  Keeper ${keeper._id} updated`);
  }

  console.log('Dedupe complete.');
  process.exit(0);
}

dedupe().catch(err => {
  console.error('Dedupe error:', err);
  process.exit(1);
});
