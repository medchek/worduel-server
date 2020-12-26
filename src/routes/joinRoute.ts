import { RoomManager } from "./../core/RoomManager";
import { Request, Response, Router } from "express";
/**
 * Handles the join room get request. It will check and inform the client about the room availability.
 * It sends the following status codes:
 * - 200 = accepted request.
 * - 403 = room is currently full
 * - 404 = invalid id/room does not exist
 * - 400 = missing request param roomId
 * @param rooms RoomManger object to check for room data
 * @returns Router to be used as an express middleware
 */
export const joinRoute = (rooms: RoomManager): Router => {
  return Router().get("/join/:roomId", (req: Request, res: Response) => {
    // console.log(req.headers);
    const requestedRoomId = req.params.roomId;
    if (requestedRoomId) {
      const targetRoom = rooms.getRoom(requestedRoomId);
      if (targetRoom !== undefined) {
        if (!targetRoom.isFull) {
          return res.sendStatus(200);
        } else {
          res.status(403).send("room full");
        }
      } else {
        return res.status(404).send("room not found");
      }
    } else {
      return res.sendStatus(400);
    }
  });
};
