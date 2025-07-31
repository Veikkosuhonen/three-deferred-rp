import { Text } from "troika-three-text";
import { Game } from "./gameState";

export const setupUI = (game: Game) => {
  const myText = new Text()
  game.texts.add(myText)

  // Set properties to configure:
  myText.text = 'Hello world!'
  myText.fontSize = 0.5
  myText.position.z = -1
  myText.position.x = -1
  myText.position.y = 0
  myText.color = 0xf0ffff

  // Update the rendering:
  myText.sync()
}