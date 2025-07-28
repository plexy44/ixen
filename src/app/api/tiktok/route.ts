// File: app/api/tiktok/route.ts

import { WebcastPushConnection } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic';

function createSSEStream(username: string) {
  let tiktokConnection: WebcastPushConnection;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (event: string, data: any) => {
        try {
            controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch(e) {
            // Controller likely closed, ignore
        }
      };

      try {
        console.log(`[SSE] Starting stream for @${username}`);
        
        // Instantiate the library with the correct class name and new options
        tiktokConnection = new WebcastPushConnection(username, {
          // This option is critical for running in serverless/cloud environments
          processBeforeConnecting: false, 
        });

        tiktokConnection.on('connect', (state) => {
          console.log(`[TikTok] Connected to stream for @${username}. Room ID: ${state.roomId}`);
          enqueue('connected', { message: `Connected to @${username}` });
        });

        tiktokConnection.on('comment', (comment) => {
          enqueue('comment', comment);
        });

        tiktokConnection.on('disconnect', (reason) => {
          console.log(`[TikTok] Disconnected. Reason: ${reason}`);
          enqueue('disconnected', { message: 'Stream disconnected.' });
          controller.close();
        });

        // --- IMPROVED ERROR HANDLING ---
        tiktokConnection.on('error', (err: any) => {
          // This will now catch any thrown object and provide more detail.
          const errorDetails = err.message || JSON.stringify(err);
          console.error(`[TikTok] Connection error for @${username}:`, errorDetails);
          enqueue('error', { message: 'A connection error occurred.', error: errorDetails });
          controller.close();
        });
        
        tiktokConnection.connect();

      } catch (err: any) {
        const errorDetails = err.message || JSON.stringify(err);
        console.error(`[SSE] Setup error for @${username}:`, errorDetails);
        enqueue('error', { message: 'Failed to set up stream.', error: errorDetails });
        controller.close();
      }
    },
    cancel() {
      console.log(`[SSE] Client disconnected from @${username}.`);
      if (tiktokConnection) {
        tiktokConnection.disconnect();
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
    return new Response(JSON.stringify({ error: 'Username is required' }), { status: 400 });
  }

  const cleanedUsername = username.startsWith('@') ? username.substring(1) : username;

  return createSSEStream(cleanedUsername);
}
