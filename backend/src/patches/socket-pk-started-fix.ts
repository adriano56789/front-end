/**
 * socket-pk-started-fix.ts — CORRECTED pk_started handler
 *
 * The current handler uses roomId (streamId) as battleId, which is wrong.
 * The fix: accept battleId from the data payload (the actual battle _id).
 *
 * Deploy: replace the pk_started handler in socket.ts with this code.
 *
 * BEFORE (BROKEN):
 *   socket.on('pk_started', async (data) => {
 *     const { roomId, opponentStreamId, durationSeconds } = data;
 *     io.to(roomId).emit('pk_battle_start', {
 *       battleId: roomId,  // ❌ roomId is a streamId, not battle _id
 *       ...
 *     });
 *   });
 *
 * AFTER (FIXED):
 *   socket.on('pk_started', async (data) => {
 *     const { battleId, roomId, opponentStreamId, durationSeconds } = data;
 *     const actualBattleId = battleId || roomId;  // ✅ Prefer real battleId
 *     ...
 *   });
 */

// ═══════════════════════════════════════════════════════════════════
// REPLACE the existing pk_started handler in socket.ts with:
// ═══════════════════════════════════════════════════════════════════

/*
    // pk_started — sincroniza espectadores sobre início da PK
    // CORREÇÃO: usa battleId real (MongoDB _id) em vez de roomId (streamId)
    socket.on('pk_started', async (data) => {
        try {
            const { battleId, roomId, opponentStreamId, durationSeconds } = data;

            // ⚠️ battleId é o _id real do documento Battle (vindo de pkRoutes /start).
            // Para backward compatibility, se battleId não vier, usa roomId.
            const actualBattleId = battleId || roomId;

            const payload = {
                battleId: actualBattleId,  // ✅ MongoDB _id do Battle, não streamId
                opponentId: opponentStreamId,
                durationSeconds: durationSeconds || 300,
                startedAt: new Date()
            };

            // Broadcast para a sala do host
            io.to(roomId).emit('pk_battle_start', {
                ...payload,
                opponentId: opponentStreamId,  // Oponente para o host
            });

            // Broadcast para a sala do oponente
            io.to(opponentStreamId).emit('pk_battle_start', {
                ...payload,
                opponentId: roomId,  // O host para o oponente
            });

            // Join ambos os hosts à room da battle (para receber updates)
            // NOTA: os hosts já estão nas salas das suas streams.
            // O battleId é usado para room de updates específicos da battle.

            console.log(`🏆 [PK Started] PK iniciada: ${actualBattleId} (${roomId} vs ${opponentStreamId})`);
        }
        catch (error) {
            console.error('❌ Erro ao processar pk_started:', error);
        }
    });
*/

// ═══════════════════════════════════════════════════════════════════
// ALSO fix pk_heart_add to handle battleId properly:
// ═══════════════════════════════════════════════════════════════════

/*
    // pk_heart_add — incrementa corações da PK
    // CORREÇÃO: battleId já deve ser o _id real do Battle
    socket.on('pk_heart_add', async (data) => {
        try {
            const { battleId, team } = data;
            if (!battleId || !team) return;

            const field = team === 'A' ? 'heartsA' : 'heartsB';
            const updated = await Battle.findOneAndUpdate(
                { _id: battleId, status: 'active' },  // ✅ Also check status
                { $inc: { [field]: 1 } },
                { returnDocument: 'after' }
            );
            if (updated) {
                const payload = {
                    battleId,
                    heartsA: updated.heartsA || 0,
                    heartsB: updated.heartsB || 0,
                    team
                };
                // Emit to both hosts
                io.to(`user_${updated.streamerA?.toString()}`).emit('pk_heart_update', payload);
                io.to(`user_${updated.streamerB?.toString()}`).emit('pk_heart_update', payload);
            }
        }
        catch (error) {
            console.error('❌ Erro ao processar pk_heart_add:', error);
        }
    });
*/
