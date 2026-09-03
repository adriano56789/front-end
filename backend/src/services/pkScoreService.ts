/**
 * pkScoreService.ts — PK Score from Gifts
 *
 * Import this in giftRoutes.ts (or liveRoutes.ts) after processGiftSend:
 *
 *   import { updatePKScoreFromGift } from '../services/pkScoreService';
 *
 *   // After gift is processed successfully:
 *   await updatePKScoreFromGift(io, toUser, giftPrice, amount);
 *
 * Score logic:
 *   - Find active Battle where toUser is streamerA or streamerB
 *   - Increment scoreA or scoreB by (giftPrice × amount)
 *   - Emit pk_score_update to both hosts + spectators
 *
 * Uses $inc for atomicity — no race conditions.
 */

import mongoose from 'mongoose';

// Cache Battle model reference to avoid repeated require()
let BattleModel: any = null;

async function getBattleModel(): Promise<any> {
  if (BattleModel) return BattleModel;
  try {
    const models = require('../models/index');
    BattleModel = models.Battle;
    return BattleModel;
  } catch {
    return mongoose.model('Battle');
  }
}

/**
 * After a gift is sent, check if the receiver is in an active PK battle
 * and update the score accordingly.
 *
 * @param io          - Socket.IO instance
 * @param receiver    - The user who RECEIVED the gift (toUser)
 * @param giftPrice   - Price of a single gift (in coins/diamonds)
 * @param quantity    - How many gifts were sent
 */
export async function updatePKScoreFromGift(
  io: any,
  receiver: { _id?: any; id?: string },
  giftPrice: number,
  quantity: number
): Promise<void> {
  try {
    if (!receiver || !giftPrice || giftPrice <= 0) return;

    const Battle = await getBattleModel();
    const totalIncrement = giftPrice * quantity;

    // Find active battle where this user is a participant
    // receiver._id is the MongoDB ObjectId from the User model
    // receiver.id is the string ID used in the frontend
    // 
    // ⚠️ streamerA/streamerB contain userIds (not streamIds)
    // We search by both _id and id to handle ObjectId vs string matching
    const receiverIdStr = receiver.id || receiver._id?.toString();
    const receiverObjectId = receiver._id;
    
    const activeBattle = await Battle.findOne({
      status: 'active',
      $or: [
        { streamerA: receiverIdStr },
        { streamerB: receiverIdStr },
        ...(receiverObjectId ? [
          { streamerA: receiverObjectId },
          { streamerB: receiverObjectId },
        ] : []),
      ],
    }).lean();

    if (!activeBattle) return; // No active PK, nothing to do

    // Determine which score to increment
    const receiverStr = (receiver._id || receiver.id)?.toString();
    const isStreamerA = activeBattle.streamerA?.toString() === receiverStr;
    const scoreField = isStreamerA ? 'scoreA' : 'scoreB';

    // Atomic increment — safe against concurrent updates
    const updated = await Battle.findOneAndUpdate(
      { _id: activeBattle._id, status: 'active' },
      { $inc: { [scoreField]: totalIncrement } },
      { returnDocument: 'after' }
    );

    if (!updated) return; // Battle ended between findOne and update

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'GIFT_SCORE',
      battleId: activeBattle._id.toString(),
      team: isStreamerA ? 'A' : 'B',
      increment: totalIncrement,
      scoreA: updated.scoreA,
      scoreB: updated.scoreB,
      receiverId: receiver.id || receiver._id?.toString(),
    }));

    // Broadcast to both hosts + spectators
    if (io) {
      const payload = {
        battleId: activeBattle._id.toString(),
        scoreA: updated.scoreA || 0,
        scoreB: updated.scoreB || 0,
      };

      // To both hosts (streamerA/B are userIds)
      const streamerA = activeBattle.streamerA?.toString();
      const streamerB = activeBattle.streamerB?.toString();

      if (streamerA) io.to(`user_${streamerA}`).emit('pk_score_update', payload);
      if (streamerB) io.to(`user_${streamerB}`).emit('pk_score_update', payload);

      // To spectators (use stream room via roomId or streamAId)
      const spectatorRoom = (activeBattle as any).roomId || (activeBattle as any).streamAId;
      if (spectatorRoom) {
        io.to(spectatorRoom).emit('pk_score_update', payload);
      }
    }
  } catch (error: any) {
    // Non-fatal: log but don't break the gift flow
    console.error('[PK-SCORE] Error updating PK score from gift:', error.message);
  }
}
