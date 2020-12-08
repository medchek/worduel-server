// # This class is a reference for the various error/success codes used within the server source code

export class ReferenceCodes {
  // ! ERROR CODES
  static readonly 101 = "Invalid/unexpected game id"; // used in RoomManager.createNewRoom()
  static readonly 102 = "Player is already in a room"; // used in RoomManager.createNewRoom()
  static readonly 103 = "Player is already in a Room or Room does not exist"; // used in RoomManager.joinRoom()
  // static readonly

  // * SUCCESS CODES

  static readonly 201 = "room created successfully"; // used in GameServer.createNewRoom().then(resolve())
}
