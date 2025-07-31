import { TimelinePlayer } from "parameter-flow";

const player = new TimelinePlayer({
  // Length of the timeline in seconds
  duration: 10,

  // Defaults to true. Set to false if you want to handle keyboard input yourself
  keyboardListener: true,

  bpm: 120,
});

export default player;
