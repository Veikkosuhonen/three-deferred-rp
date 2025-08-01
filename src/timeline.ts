import * as THREE from "three";
import { TimelinePlayer, PFAnimation } from "./libs/parameter-flow/src";

const v3 = (v: [number, number, number]) => new THREE.Vector3(v[0], v[1], v[2]);

export const timelineValues = {
  START_POS: v3([
    -4.2291953498318975,
    15.693451467364195,
    999.9921482234816,
  ]),
  START_TARGET: v3([
    41.59026726386266,
    -2.7038816825696058e-14,
    996.9170208916597,
  ]),
  END_POS: v3([1801.0725393479772,119.67075543376373,1933.0851800347223,]),
  END_TARGET: v3([1356.0005624752432,2.4710008481333807e-15,1449.0055864399815,]),
}

export const timeline: { [key: string]: any, time: number, acceleration?: number, speed?: number }[] = [
  {
    time: 0,
    position: timelineValues.START_POS,
    target: timelineValues.START_TARGET,
    focus: 100.0,
    maxBlur: 0.007,
  },
  {
    time: 1,
    position: timelineValues.START_POS,
    target: timelineValues.START_TARGET,
  },
  {
    time: 6.39803707742639,
    position: v3([192.8745295148464,15.693451529354627,1001.6814466643715,]),
    target: v3([238.18606583843248,-2.7397527725884996e-14,994.2152403743402,]) ,
    bgFlicker: 0xd0ffff,
  },
  {
    time: 11.04362050163577,
    position: v3([369.7640519014423,22.94373518769161,958.722950417146,]),
    target: v3([404.2878431448877,-2.8108392847266604e-14,985.0190717688087,]) 
  },
  {
    time: 13.039258451472191,
    position: v3([437.9649505433191,17.225991229434054,1000.4087987334901,]),
    target: v3([445.1987952917132,-2.7328539871610698e-14,1043.7522560488003,]) ,
    bgFlicker: 0xf0ffff,
  },
  {
    time: 15.95092693565976,
    position: v3([488.1764991196465,18.488278113458232,1123.2960039331076,]),
    target: v3([529.7984864289657,-2.7418783500193504e-14,1110.9059950329167,]),
    bgFlicker: 0x90ffff,
  },
  {
    time: 17,
    position: v3([573.5313321729628,58.72068672632215,1146.032990354295,]),
    target: v3([585.1080356699118,-2.774320132250508e-14,1111.2181320920113,]) 
  },
  {
    time: 20.236641221374043,
    position: v3([775.8892114920822,14.808049358553358,1047.8016992550974,]),
    target: v3([679.9682556496305,-2.8168356096333637e-14,1082.8350286165758,]) 
  },
  {
    time: 23.377317339149403,
    position: v3([899.9072063462887,129.7117873102508,954.9901733548099,]),
    target: v3([784.0446770331785,-2.834419347934133e-14,1045.5780427161906,]) 
  },
  {
    time: 25.293347873500544,
    position: v3([917.3832818087549,85.25950656092446,934.0850765728562,]),
    target: v3([949.2264831605614,-2.8534578012049745e-14,1017.702519061138,]) 
  },
  {
    time: 27.947655398037078,
    position: v3([958.477655795756,13.17151924359216,1026.5921129566862,]),
    target: v3([991.4616932881944,-2.850332146415954e-14,1071.5051636328162,]) 
  },
  {
    time: 29.947655398037078,
    position: v3([993.1019356538288,7.316832607341746,1053.588170330474,]),
    target: v3([1004.1327296298012,-2.850282345636472e-14,1091.3199261488287,]) 
  },
  {
    time: 32.969792802617233,
    position: v3([1010.2156914532454,6.748825491860664,1139.8594127190456,]),
    target: v3([1005.9383047244953,-2.8499608574378757e-14,1161.392608580148,]) 
  },
  {
    time: 34.954961832061072,
    position: v3([987.9423283452838, 2.0352998675869796,1244.716524581122,]),
    target: v3([998.624643127649,-2.849420611253825e-14,1261.2269111992953,]),
    focus: 50.0
  },
  {
    time: 36.08756815703381,
    position: v3([1009.78180171514,7.0106574270917,1318.5377522767833,]),
    target: v3([1028.6598002850233,-2.8556870705210217e-14,1314.3102696808648,]) 
  },
  {
    time: 37.48015267175573,
    position: v3([1056.0156134169922,4.9956359255543346,1307.7354214472275,]),
    target: v3([1069.1458047402612,-2.8523424518128175e-14,1318.957143611509,]) 
  },
  {
    time: 40.10359869138495,
    position: v3([1085.8846409058203,9.840791076970394,1333.770175791024,]),
    target: v3([1111.345937298515,-2.8523623589785714e-14,1310.0308696690888,]) 
  },
  {
    time: 41.099236641221374,
    position: v3([1116.4211003273633,18.140035276439892,1333.975226211224,]),
    target: v3([1127.2151584103235,-2.849363823610822e-14,1306.9052235715121,]) 
  },
  {
    time: 44.86586695747001,
    position: v3([1201.0084954068357,89.45413812985164,1151.1290078439479,]),
    target: v3([1199.8499006026666,-2.8396140239765902e-14,1146.787082881482,]) ,
    bgFlicker: 0x1fffff,
    focus: 200.0,
  },
  {
    time: 60,
    position: timelineValues.END_POS,
    target: timelineValues.END_TARGET,
    bgFlicker: 0x2fffff,
    focus: 300.0,
  },
]

export const getTimeLineTrack = (key: string) => {
  return timeline.filter((frame) => key in frame).map((frame) => ({
    time: frame.time,
    value: frame[key],
    speed: frame.speed,
  }));
}

const player = new TimelinePlayer({
  duration: 60,
  bpm: 140,
  // Length of the timeline in seconds

  // Defaults to true. Set to false if you want to handle keyboard input yourself
  keyboardListener: true,
});

type Frame<T> = {
  time: number;
  value: T;
}

export const makeFloatAnim = (frames: Frame<number>[]) => {
  const anim = new PFAnimation({
    v: frames.map((frame, j) => { 
      const prev = frames[j - 1];
      let speed: number | undefined;
      if (prev && j !== frames.length - 1) {
        const diff = frame.value - prev.value;
        const tdiff = frame.time - prev.time;
        speed = diff / tdiff / 1.6
      }
      
      return {
        time: frame.time, value: frame.value, speed
      }
    })
  })
  return anim
}

export const makeVectorAnim = (frames: Frame<THREE.Vector3>[]) => {
  const keys = ["x", "y", "z"] as const;
  const anim = new PFAnimation(Object.fromEntries(
    keys.map((k) => 
      [
        k,
        frames.map((frame, j) => { 
          const prev = frames[j - 1];
          let speed: number | undefined;
          if (prev && j !== frames.length - 1) {
            const diff = frame.value[k] - prev.value[k];
            const tdiff = frame.time - prev.time;
            speed = diff / tdiff / 1.6
          }
          
          return {
            time: frame.time, value: frame.value[k], speed
          }
        })
      ]
    )),
  )
  return anim
}

export const makeMatrixAnim = (frames: THREE.Matrix4[], times: number[]) => {
  const elements = frames[0].elements;
  const anim = new PFAnimation(Object.fromEntries(
    elements.map((_, i) => 
      [
        `m${i}`,
        frames.map((frame, j) => (
          { time: times[j], value: frame.elements[i] }
        )),
      ]
    )),
  )
  return anim
}

export const setLookAtFromAnims = (positionAnim: PFAnimation, targetAnim: PFAnimation, camera: THREE.PerspectiveCamera) => {
  const p = positionAnim.getValuesAt(player.currentTime);
  const t = targetAnim.getValuesAt(player.currentTime);

  camera.position.set(p.x, p.y, p.z);
  camera.lookAt(t.x, t.y, t.z);
}

export const getFloat = (anim: PFAnimation) => anim.getValuesAt(player.currentTime).v;

export default player;
