
// File: app/api/tiktok/route.ts

import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic';

function createSSEStream(username: string) {
  let tiktokLiveConnection: TikTokLiveConnection;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: string, data: any) => {
        if (!isClosed) {
            try {
                controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            } catch (e) {
                // The controller is likely closed, which is okay in many cases (client disconnected).
            }
        }
      };
      
      const cleanup = (reason: string) => {
          if (isClosed) return;
          console.log(`[SSE] Closing stream for @${username}. Reason: ${reason}`);
          isClosed = true;
          if (tiktokLiveConnection) {
            tiktokLiveConnection.disconnect();
          }
          try {
            controller.close();
          } catch(e) {
            // Controller may already be closed, which is fine.
          }
      }

      console.log(`[SSE] Starting stream for @${username}`);
      
      // Use a temporary connection to check if the user is live first
      const tempConnection = new TikTokLiveConnection(username, { fetchRoomInfoOnConnect: false });
      
      try {
        const isLive = await tempConnection.fetchIsLive();
        if (!isLive) {
          enqueue('error', { message: `User @${username} is not live.` });
          cleanup('User not live');
          return;
        }
      } catch (err: any) {
        enqueue('error', { message: `Failed to check live status for @${username}. The user might not exist.`, error: err.message || err });
        cleanup('Failed to check live status');
        return;
      }
      
      
      tiktokLiveConnection = new TikTokLiveConnection(username, {
        // Recommended options for stability in cloud environments
        processInitialData: false,
        fetchRoomInfoOnConnect: true,
        requestRetryCount: 20,
        requestRetryDelay: 2000,
        connectWithUniqueId: true,
        disableEulerFallbacks: true,
      });

      tiktokLiveConnection.on(ControlEvent.CONNECTED, (state) => {
        console.log(`[TikTok] Successfully connected to stream for @${username}. Room ID: ${state.roomId}`);
        enqueue('connected', { message: `Connected to @${username}` });
      });

      tiktokLiveConnection.on(WebcastEvent.CHAT, (comment) => {
        enqueue('comment', comment);
      });
      
      tiktokLiveConnection.on(WebcastEvent.GIFT, (gift) => {
        // We only want to process the gift when the streak ends
        if (gift.giftType === 1 && !gift.repeatEnd) {
          return;
        }
        enqueue('gift', gift);
      });

      tiktokLiveConnection.on(ControlEvent.DISCONNECTED, (reason) => {
        console.log(`[TikTok] Disconnected from @${username}'s stream. Reason: ${reason}`);
        enqueue('disconnected', { message: 'Stream disconnected.' });
        cleanup('Disconnected');
      });

      tiktokLiveConnection.on(ControlEvent.ERROR, (err: any) => {
        let errorPayload;
        if (err instanceof Error) {
            errorPayload = { message: err.message, name: err.name, stack: err.stack };
        } else if (typeof err === 'object' && err !== null) {
            // Ensure we don't just pass an empty object.
            errorPayload = Object.keys(err).length > 0 ? err : { message: 'An unknown error object was received from the TikTok connector.' };
        } else {
            errorPayload = { message: String(err) };
        }
        
        console.error(`[TikTok] Error from TikTok connector for @${username}:`, errorPayload);
        enqueue('error', { message: 'An error occurred with the TikTok connection.', error: errorPayload });
        cleanup('Error');
      });
      
      try {
        await tiktokLiveConnection.connect();
      } catch (err) {
        enqueue('error', { message: 'Failed to connect to the stream.', error: err instanceof Error ? err.message : String(err) });
        cleanup('Connection failed');
      }
    },
    cancel() {
      if (!isClosed) {
        console.log(`[SSE] Client disconnected from @${username}'s stream.`);
        cleanup('Client disconnected');
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanedUsername = username.startsWith('@') ? username.substring(1) : username;

  return createSSEStream(cleanedUsername);
}
