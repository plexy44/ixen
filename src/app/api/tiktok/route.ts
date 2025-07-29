
import puppeteer, { Browser, Page } from 'puppeteer';

export const dynamic = 'force-dynamic';

// Share one browser instance to be efficient across serverless function invocations.
let browser: Browser | null = null;

async function createPuppeteerStream(username: string) {
    let page: Page | null = null;
    let isCleaningUp = false;

    const stream = new ReadableStream({
        async start(controller) {
            const enqueue = (event: string, data: any) => {
                if (!isCleaningUp) {
                    try {
                        controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
                    } catch (e) {
                        // Ignore errors if the controller is already closed
                    }
                }
            };
            
            const cleanup = async (reason: string) => {
                if (isCleaningUp) return;
                isCleaningUp = true;
                console.log(`[Puppeteer] Cleaning up for @${username}. Reason: ${reason}`);
                if (page) {
                    try {
                        await page.close();
                    } catch (e) {
                        console.error(`[Puppeteer] Error closing page for @${username}:`, e);
                    }
                }
                 try {
                    controller.close();
                } catch(e) {
                    // Ignore: Controller may already be closed.
                }
            };

            try {
                console.log('[Puppeteer] Launching browser...');
                if (!browser) {
                    browser = await puppeteer.launch({
                        headless: true,
                        args: [
                          '--no-sandbox', 
                          '--disable-setuid-sandbox',
                          '--disable-gpu',
                          '--disable-dev-shm-usage',
                          '--no-first-run',
                          '--no-zygote',
                          '--single-process',
                        ]
                    });
                }

                page = await browser.newPage();
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

                console.log(`[Puppeteer] Navigating to @${username}'s live page...`);
                await page.goto(`https://www.tiktok.com/@${username}/live`, { waitUntil: 'networkidle2' });
                
                // Add a listener for the page crashing
                page.on('error', (err) => {
                    console.error(`[Puppeteer] Page crashed for @${username}:`, err);
                    enqueue('error', { message: 'The browser page crashed. Please try again.'});
                    cleanup('Page crashed');
                });
                
                const isLive = await page.evaluate(() => {
                    // Check for multiple selectors that indicate a stream has ended or is not available
                    const endedSelector = '.tiktok-1w1v2n1-DivLiveEnded, .tiktok-j62k2q-DivContainer';
                    return !document.querySelector(endedSelector);
                });

                if (!isLive) {
                    throw new Error('User is not live or the stream has ended.');
                }

                enqueue('connected', { message: `Connected to @${username}` });
                console.log(`[Puppeteer] Successfully connected to @${username}'s live stream.`);

                await page.exposeFunction('onNewData', (data: { type: string; payload: any }) => {
                   enqueue(data.type, data.payload);
                });

                await page.evaluate(() => {
                    const chatContainer = document.querySelector('[class*="DivChatRoom"]');
                    if (!chatContainer) {
                         (window as any).onNewData({
                             type: 'error',
                             payload: { message: 'Could not find chat container. The page structure might have changed.' }
                         });
                        return;
                    }

                    const observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            for (const node of mutation.addedNodes) {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    const element = node as HTMLElement;
                                    
                                    // Check for comments
                                    const commentSpan = element.querySelector('[class*="CommentText"]');
                                    const userSpan = element.querySelector('[class*="NickName"]');
                                    if (commentSpan && userSpan) {
                                        (window as any).onNewData({
                                            type: 'comment',
                                            payload: {
                                                uniqueId: userSpan.textContent?.trim() || 'Unknown User',
                                                comment: commentSpan.textContent?.trim(),
                                                profilePictureUrl: element.querySelector('img')?.src
                                            }
                                        });
                                    }

                                    // Check for gifts
                                    const giftUserSpan = element.querySelector('[class*="GiftNickName"]');
                                    const giftDescSpan = element.querySelector('[class*="GiftInfo"]');
                                    if(giftUserSpan && giftDescSpan) {
                                        const giftMatch = giftDescSpan.textContent?.match(/Sent (.+) x(\d+)/);
                                        if (giftMatch) {
                                            (window as any).onNewData({
                                                type: 'gift',
                                                payload: {
                                                    uniqueId: giftUserSpan.textContent?.trim() || 'Unknown User',
                                                    giftName: giftMatch[1].trim(),
                                                    repeatCount: parseInt(giftMatch[2], 10),
                                                    profilePictureUrl: element.querySelector('img')?.src
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    });

                    observer.observe(chatContainer, { childList: true, subtree: true });
                });

            } catch (err: any) {
                const errorMessage = `Failed to connect. ${err.message}`;
                console.error(`[Puppeteer] Error for @${username}:`, errorMessage);
                enqueue('error', { message: errorMessage });
                await cleanup(`Error: ${err.message}`);
            }
        },
        async cancel() {
            if (!isCleaningUp) {
                console.log(`[Puppeteer] Client disconnected from @${username}'s stream.`);
                await cleanup('Client disconnected');
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
    
    return createPuppeteerStream(cleanedUsername);
}
