// connections.js
// storing player connections, will later implement DB

// connectionId : connection object
const connections = new Map();   
// userId : connectionId 
const userToConnection = new Map(); 

// create pending request until other user accepts
function createRequest(fromUserId, toUserId) {
  if (fromUserId === toUserId) {
    throw new Error("A user cannot connect to themselves");
  }

  // dont allow a new request if either user is already tied up
  if (getConnectionForUser(fromUserId) || getConnectionForUser(toUserId)) {
    throw new Error("One of the users is already connected or has a pending request");
  }

  const id = `${fromUserId}-${toUserId}-${Date.now()}`;
  const conn = {
    id,
    userA: fromUserId,
    userB: toUserId,
    status: "pending", // pending, active, ended
    createdAt: Date.now(),
    acceptedAt: null,
    endedAt: null,
  };

  connections.set(id, conn);
  userToConnection.set(fromUserId, id);
  userToConnection.set(toUserId, id);

  return conn;
}


function acceptRequest(connectionId, acceptingUserId) {
  const conn = connections.get(connectionId);
  if (!conn) throw new Error("Connection not found");
  if (conn.status !== "pending") throw new Error("Connection is not pending");
  //just a precaution, requests are not public
  if (conn.userB !== acceptingUserId) {
    throw new Error("Only the requested user can accept this connection");
  }

  conn.status = "active";
  conn.acceptedAt = Date.now();
  return conn;
}

function rejectRequest(connectionId, rejectingUserId) {
  const conn = connections.get(connectionId);
  if (!conn) throw new Error("Connection not found");
  if (conn.status !== "pending") throw new Error("Connection is not pending");
  if (conn.userB !== rejectingUserId) {
    throw new Error("Only the requested user can reject this connection");
  }

  cleanup(conn);
  return conn;
}

function getConnectionForUser(userId) {
  const connId = userToConnection.get(userId);
  return connId ? connections.get(connId) ?? null : null;
}

// get other user in a connection
function getOtherUser(userId) {
  const conn = getConnectionForUser(userId);
  if (!conn) return null;
  if (conn.userA === userId) return conn.userB;
  if (conn.userB === userId) return conn.userA;
  return null;
}

// end active or pending ocnnectoin
function endConnection(userId) {
  const conn = getConnectionForUser(userId);
  if (!conn) return null;

  conn.status = "ended";
  conn.endedAt = Date.now();
  cleanup(conn);

  return conn;
}

function isConnected(userId) {
  const conn = getConnectionForUser(userId);
  return !!conn && conn.status === "active";
}

//remove connectoin from lookup map
function cleanup(conn) {
  userToConnection.delete(conn.userA);
  userToConnection.delete(conn.userB);
  connections.delete(conn.id);
}

module.exports = {
  createRequest,
  acceptRequest,
  rejectRequest,
  getConnectionForUser,
  getOtherUser,
  endConnection,
  isConnected,
};