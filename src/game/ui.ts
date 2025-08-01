import { Text } from "troika-three-text";
import { Game } from "./gameState";
import player, { getTimeLineTrack, makeFloatAnim } from "../timeline";

export const setupUI = (game: Game) => {
  const myText = new Text()
  const myText2 = new Text()
  game.texts.add(myText)
  game.texts.add(myText2)

  // Set properties to configure:
  myText.font = './astrolyt.ttf'
  myText2.font = './astrolyt.ttf'
  myText.text = 'Hello'
  myText2.text = 'Assembly!'
  myText.fontSize = 0.35
  myText2.fontSize = 0.35
  myText.position.z = -1
  myText2.position.z = -1

  

  game.addRenderListener(() => {
    myText.position.y = Math.sin(player.currentTime * 3.0) * 0.1 + 0.2
    myText2.position.y = Math.sin(player.currentTime * 3.0) * 0.1 - 0.1
    myText.position.x = Math.cos(player.currentTime * 3.0) * 0.1 - 0.4
    myText2.position.x = Math.cos(player.currentTime * 3.0) * 0.1 - 0.9
    myText.color = 0xf0ffff
    myText2.color = 0xf0ffff
    myText.sync()
    myText2.sync()
  })
}