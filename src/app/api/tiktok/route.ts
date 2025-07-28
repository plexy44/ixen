
import { TikTokLiveConnector } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic'; // Defaults to auto
// Helper to create a response with Server-Sent Events
function createSSEStream(username: string) {
  const stream = new ReadableStream({
    start(controller) {
      try {
        console.log(`Attempting to connect to @${username}'s stream...`);
        const tiktokLiveConnector = new TikTokLiveConnector(username, {
          // These options are recommended for stability
          requestRetryCount: 20,
          requestRetryDelay: 2000,
          fetchSubgifts: false, // Set to true if you want to receive gift data
        });

        const enqueue = (event: string, data: any) => {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        tiktokLiveConnector.on('connect', (state) => {
          console.log(`Successfully connected to stream for @${username}. Room ID: ${state.roomId}`);
          enqueue('connected', { message: `Connected to @${username}` });
        });

        tiktokLiveConnector.on('comment', (comment) => {
          enqueue('comment', comment);
        });

        tiktokLiveConnector.on('disconnect', (reason) => {
          console.log(`Disconnected from @${username}'s stream. Reason: ${reason}`);
          enqueue('disconnected', { message: 'Stream disconnected.' });
          controller.close();
        });

        tiktokLiveConnector.on('error', (err) => {
          console.error(`Error from TikTok connector for @${username}:`, err);
          enqueue('error', { message: 'An error occurred.', error: err.toString() });
          controller.close();
        });
        
        tiktokLiveConnector.connect().catch((err) => {
            console.error(`Failed to connect to @${username}:`, err);
            enqueue('error', { message: `Failed to connect to @${username}. Is the user live?`, error: err.toString() });
            controller.close();
        });

      } catch (err: any) {
        console.error(`Server-side error for @${username}:`, err);
        controller.enqueue(`event: error\ndata: ${JSON.stringify({ message: 'A server error occurred.', error: err.toString() })}\n\n`);
        controller.close();
      }
    },
    cancel() {
      // This is called when the client disconnects.
      // We don't have a direct `disconnect` method on the connector instance,
      // but closing the stream should clean things up.
      console.log(`Client disconnected from @${username}'s stream.`);
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

  // Remove leading '@' if present
  const cleanedUsername = username.startsWith('@') ? username.substring(1) : username;

  return createSSEStream(cleanedUsername);
}
