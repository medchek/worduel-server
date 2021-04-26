import { Request, Response, Router } from "express";
export default (): Router =>
  Router().get("/", (req: Request, res: Response) => {
    res.sendStatus(404);
  });
