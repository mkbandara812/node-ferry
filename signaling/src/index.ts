export interface Env {
  ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    
    // Path routing: Expecting WebSocket connections at /room/<roomId>
    if (pathParts[1] === 'room' && pathParts[2]) {
      const roomId = pathParts[2];
      
      // Get the unique Durable Object ID for this specific room
      const id = env.ROOM.idFromName(roomId);
      const roomObject = env.ROOM.get(id);
      
      // Forward the request to the Durable Object
      return roomObject.fetch(request);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

// The Durable Object class that manages WebSocket connections for a single room
export class Room implements DurableObject {
  state: DurableObjectState;
  sessions: WebSocket[];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sessions = [];
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    // Create a WebSocket pair for the client and the server (Durable Object)
    const [client, server] = Object.values(new WebSocketPair());
    
    this.sessions.push(server);
    server.accept();
    
    server.addEventListener('message', (event) => {
      // Broadcast incoming SDP or ICE candidates to all OTHER peers in this room
      for (const session of this.sessions) {
        if (session !== server) {
          session.send(event.data);
        }
      }
    });
    
    server.addEventListener('close', () => {
      // Remove the disconnected session from the room
      this.sessions = this.sessions.filter(s => s !== server);
    });
    
    server.addEventListener('error', () => {
      this.sessions = this.sessions.filter(s => s !== server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}
