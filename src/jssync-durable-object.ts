import { YDurableObjects } from "y-durableobjects";

export interface JsSyncEnv {
  JSSYNC_ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
}

// Use any to bypass TypeScript issues with y-durableobjects for now
export class JSSyncDurableObject extends (YDurableObjects as any) {
  private isInitialized: boolean = false;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrade requests and other HTTP requests
    const response = await super.fetch(request);

    // Try to initialize after the parent has handled the request
    if (!this.isInitialized) {
      // Use a small delay to ensure the document is ready
      setTimeout(() => {
        this.initializeRoom().then(() => {
          this.isInitialized = true;
        });
      }, 100);
    }

    return response;
  }

  private async initializeRoom(): Promise<void> {
    try {
      // Access the internal Yjs document directly
      const text = (this as any).doc.getText('codemirror');

      if (text.length === 0) {
        // Initialize with default JavaScript content
        const initialContent = this.getInitialJsContent();

        // Use a transaction to ensure atomicity
        (this as any).doc.transact(() => {
          text.insert(0, initialContent);
        });

        console.log('Initialized room with default JavaScript content');
      } else {
        console.log('Room already has content, skipping initialization');
      }
    } catch (error) {
      console.error('Error initializing room:', error);
    }
  }

  private getInitialJsContent(): string {
    return `console.log("Hello, World!");`;
  }

  // Custom method to get room statistics
  async getRoomStats(): Promise<{
    connections: number;
    documentSize: number;
    lastUpdate: number
  }> {
    try {
      // Note: We can't access private properties directly
      // This is a simplified version - actual implementation would need
      // to track these metrics differently
      const connections = 0; // Would need to implement connection tracking
      const documentSize = 0; // Would need to get this from YDoc state
      const lastUpdate = Date.now();

      return {
        connections,
        documentSize,
        lastUpdate
      };
    } catch (error) {
      console.error('Error getting room stats:', error);
      return {
        connections: 0,
        documentSize: 0,
        lastUpdate: 0
      };
    }
  }

  // Handle WebSocket open events
  async webSocketOpen(ws: WebSocket): Promise<void> {
    console.log('WebSocket opened');

    // Initialize room with default content when first connection opens
    if (!this.isInitialized) {
      // Small delay to ensure Yjs document is ready
      setTimeout(async () => {
        await this.initializeRoom();
        this.isInitialized = true;
      }, 250);
    }

    // Call parent open handler if it exists
    if (super.webSocketOpen) {
      await super.webSocketOpen(ws);
    }
  }

  // Handle custom WebSocket messages if needed
  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    // Handle custom message types if needed
    if (typeof message === 'string') {
      try {
        const data = JSON.parse(message);

        if (data.type === 'get-room-stats') {
          const stats = await this.getRoomStats();
          ws.send(JSON.stringify({
            type: 'room-stats',
            data: stats
          }));
          return;
        }
      } catch (error) {
        console.error('Error parsing custom message:', error);
      }
    }

    // Delegate to parent for Yjs message handling
    await super.webSocketMessage(ws, message);
  }

  // Handle WebSocket close events
  async webSocketClose(ws: WebSocket): Promise<void> {
    console.log(`WebSocket closed`);

    // Call parent close handler
    await super.webSocketClose?.(ws);

    console.log('Connection closed, room will be cleaned up automatically by Cloudflare if no more connections');
  }
}
