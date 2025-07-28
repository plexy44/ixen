
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic'; // Defaults to auto

// Helper to create a response with Server-Sent Events
function createSSEStream(username: string) {
  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (event: string, data: any) => {
        try {
            controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
            // This can happen if the client disconnects abruptly.
            console.warn('[SSE] Could not enqueue data, controller is likely closed.', e);
        }
      };

      let tiktokLiveConnector: TikTokLiveConnection;

      const connectToTikTok = async () => {
        try {
          console.log(`[SSE] Starting stream for @${username}`);
          
          tiktokLiveConnector = new TikTokLiveConnection(username, {
              requestRetryCount: 20,
              requestRetryDelay: 2000,
              fetchSubgifts: false,
              // This option can sometimes help bypass initial connection issues.
              fetchRoomInfoOnConnect: true, 
          });

          tiktokLiveConnector.on(ControlEvent.CONNECTED, (state) => {
            console.log(`[TikTok] Successfully connected to stream for @${username}. Room ID: ${state.roomId}`);
            enqueue('connected', { message: `Connected to @${username}` });
          });
  
          tiktokLiveConnector.on(WebcastEvent.CHAT, (comment) => {
            enqueue('comment', comment);
          });
  
          tiktokLiveConnector.on(ControlEvent.DISCONNECTED, (reason) => {
            console.log(`[TikTok] Disconnected from @${username}'s stream. Reason: ${reason}`);
            enqueue('disconnected', { message: 'Stream disconnected.' });
            controller.close();
          });
  
          tiktokLiveConnector.on(ControlEvent.ERROR, (err: any) => {
            console.error(`[TikTok] Error from TikTok connector for @${username}:`, err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            enqueue('error', { message: 'An error occurred with the TikTok connection.', error: errorMessage });
            controller.close();
          });

          // Use the promise-based connect method for cleaner initial error handling
          await tiktokLiveConnector.connect();

        } catch (err: any) {
          console.error(`[SSE] Server-side error for @${username}:`, err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          // Send a specific error to the client before closing
          enqueue('error', { message: `Failed to connect to @${username}. The user might not be live or the username is invalid.`, error: errorMessage });
          controller.close();
        }
      };
      
      connectToTikTok();

    },
    cancel() {
      console.log(`[SSE] Client disconnected.`);
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
