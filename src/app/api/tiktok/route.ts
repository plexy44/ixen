
// File: app/api/tiktok/route.ts

import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic';

// NEW: Function to get Room ID from TikTok profile page
async function getRoomId(username: string): Promise<string> {
    try {
        const response = await fetch(`https://www.tiktok.com/@${username}/live`);
        if (!response.ok) {
            // This handles cases where the user is not live OR the user does not exist.
            // TikTok returns a 404 page in both scenarios.
             throw new Error('Could not fetch user profile. The user may not exist or is not currently live.');
        }
        const text = await response.text();
        const roomId = text.match(/"roomId":"(\d+)"/)?.[1];

        if (!roomId) {
            throw new Error('Could not find Room ID in the profile page. The user is likely not live.');
        }
        
        console.log(`[API] Found Room ID for @${username}: ${roomId}`);
        return roomId;
    } catch (err: any) {
        // Re-throw with a more specific message for easier debugging.
        throw new Error(`Failed to get Room ID for @${username}: ${err.message}`);
    }
}


function createSSEStream(roomId: string, username:string) {
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

      console.log(`[SSE] Starting stream for @${username} (Room ID: ${roomId})`);
      
      tiktokLiveConnection = new TikTokLiveConnection(roomId, {
        // Recommended options for stability in cloud environments
        processInitialData: false,
        fetchRoomInfoOnConnect: true,
        requestRetryCount: 20,
        requestRetryDelay: 2000,
        disableEulerFallbacks: true,
      });

      tiktokLiveConnection.on(ControlEvent.CONNECTED, (state) => {
        console.log(`[TikTok] Successfully connected to stream for @${username}.`);
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

  try {
    // First, get the Room ID by scraping the profile page
    const roomId = await getRoomId(cleanedUsername);
    // Then, start the SSE stream with the Room ID
    return createSSEStream(roomId, cleanedUsername);
  } catch (err: any) {
      console.error(`[API] Top-level error for @${cleanedUsername}:`, err.message);
      // Send a user-friendly error back to the client
      return new Response(JSON.stringify({ error: 'Failed to connect', message: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
      });
  }
}
