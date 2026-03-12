export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArgumentError";
  }
}

const maxRoomIdLength = 20;

export const validateRoomId = (roomId: string): void => {
  if (roomId.length > maxRoomIdLength) {
    throw new InvalidArgumentError(
      "Room ID is too long (must be <= " + maxRoomIdLength + ")"
    );
  }
};