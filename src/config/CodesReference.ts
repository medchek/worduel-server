// # This class is a reference for the various error/success codes used within the server source code
export abstract class ReferenceCodes {
  // ! ERROR CODES
  static readonly 101 = "Invalid/unexpected game id"; // used in RoomManager.createNewRoom()
  static readonly 102 = "Player is already in a room"; // used in RoomManager.createNewRoom()
  static readonly 103 = "Player is already in a Room or Room does not exist"; // used in RoomManager.joinRoom()
  // static readonly

  // * SUCCESS CODES

  static readonly 201 = "room created successfully"; // used in GameServer.createNewRoom().then(resolve())
}

/**
 * 
Scoring System Prototype

base : 50

case 1:
player 1 => 100%
player 2 => 80%
player 3 => 60%
player 4 => 40%
player 5 => 20%
player 6 => 10%

case 2:
player 1 => 100%
player 2 => 60
player 3 => 30

FORMULA:
n = number of players. 
x = n of players for the first who answers, and decrements for the second, then the thrid, and so on.
------
((100 / n) * (n - x)) / base
-----

1st answer = (100 / n) * n
2nd answer = (100 / n) * (n - 1)
3rd answer = (100/ n) * (n - 2)
...etc

 */
