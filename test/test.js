let Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Runner = Matter.Runner;

let engine;
let world;
let digits = [];
let ziffernParts = [];
let time = [];
let ground;
let walls = [];
let mouse;
let gravityDirection = { x: 0, y: 0.3 }; // 默认重力方向向下
let stopped = false;
let reset = 0;
let magnets = [];

const cfHit = { group: 0, category: 0x0001, mask: 0xFFFFFFFF };
const cfPass = { group: -1, category: 0x0001, mask: 0x0000 };

function setup() {
  const canvas = createCanvas(960, 960);

  engine = Engine.create();
  world = engine.world;
  engine.gravity.y = 0;

  // 创建地面
  ground = new BlockCore(
    world,
    { x: 400, y: height + 10, w: width, h: 20, color: 'white' },
    { isStatic: true }
  );

  // 创建墙壁
  walls.push(new BlockCore(world, { x: -30, y: height / 2, w: 60, h: height, color: 'black' }, { isStatic: true })); // 左墙
  walls.push(new BlockCore(world, { x: width + 30, y: height / 2, w: 60, h: height, color: 'black' }, { isStatic: true })); // 右墙
  walls.push(new BlockCore(world, { x: width / 2, y: -30, w: width, h: 60, color: 'black' }, { isStatic: true })); // 上墙
  walls.push(new BlockCore(world, { x: width / 2, y: height + 30, w: width, h: 60, color: 'black' }, { isStatic: true })); // 下墙

  mouse = new Mouse(engine, canvas, { stroke: 'white', strokeWeight: 2 });

  // 加载数字 SVG
  new BlocksFromSVG(world, 'Segments_Ziffern.svg', [],
    { isStatic: true, restitution: 0.7, friction: 0.0, frictionAir: 0.0 },
    {
      save: false, sample: 10, offset: { x: 0, y: 0 }, done: (added, time, fromCache) => {
        console.log('FRAME', added, time, fromCache);
        for (let id in added) {
          const idx = id.substring(3, 4);
          added[id].attributes.stroke = 'rgb(0,79,79)'; // 设置描边颜色
          if (added[id].body) {
            if (!ziffernParts[idx]) {
              ziffernParts[idx] = [added[id]];
            } else {
              ziffernParts[idx].push(added[id]);
            }
            World.remove(world, added[id].body);
            added[id].attributes.color = 'rgb(0,79,79)'; // 设置填充颜色
          } else {
            console.log('Ziffern Teil ' + id + ' ist fehlerhaft');
          }
        }
      }
    });

  Runner.run(engine);
}

function clock() {
  if (ziffernParts.length == 10) {
    let actTime = [Math.floor(hour() / 10), hour() % 10, Math.floor(minute() / 10), minute() % 10];
    for (let d = 0; d < 4; d++) {
      if (actTime[d] != time[d]) {
        removeDigit(d, time[d]);
        createDigit(d, actTime[d]);
      }
    }
    time = actTime;
  }
}

function createDigit(d, z) {
  magnets[d] = [];
  const offsetX = (d === 2 || d === 3) ? 90 : 0;

  ziffernParts[z].forEach(part => {
    const clone = new PolygonFromSVG(world,
      {
        ...part.attributes, color: 'rgb(0,79,79)',
        fromVertices: part.attributes.fromVertices.map(v => ({ x: v.x + d * 200 + 20 + offsetX, y: v.y + 300 }))
      },
      { ...part.options, label: 'D' + d + z });
    digits.push(clone);

    const magnet = new Magnet(
      world,
      {
        x: clone.body.position.x, y: clone.body.position.y, r: 10,
        color: 'blue',
        attraction: 0.6e-4
      },
      { isStatic: true, isSensor: true });
    magnet.addAttracted(clone.body);
    magnets[d].push(magnet);
  });
}

function removeDigit(d, z) {
  if (z != undefined) {
    digits = digits.filter(part => {
      if (part.body.label == 'D' + d + z) {
        World.remove(world, part.body);
        return false;
      }
      return true;
    });
    magnets[d].forEach(magnet => World.remove(world, magnet.body));
    magnets[d] = [];
  }
}

function draw() {
  background(0);

  // 更新重力方向
  engine.world.gravity.x = gravityDirection.x;
  engine.world.gravity.y = gravityDirection.y;

  if (!stopped) {
    if (reset > 0) {
      magnets.forEach(list => list.forEach(magnet => {
        const body = magnet.attracted[0];
        if (!body.isStatic) {
          magnet.attract();
          const d = dist(magnet.body.position.x, magnet.body.position.y, body.position.x, body.position.y);
          if (d < 100) {
            reset--;
            Matter.Body.setPosition(body, body.plugin.lastPos);
            Matter.Body.setStatic(body, true);
            Matter.Body.setAngle(body, 0);
          }
        }
      }));
    } else {
      clock();
    }
  }

  digits.forEach(part => part.draw());
  ground.draw();
  walls.forEach(wall => wall.draw());
  mouse.draw();
}

function mouseMoved() {
  // 计算鼠标相对于画布中心的方向
  let centerX = width / 2;
  let centerY = height / 2;
  let dx = mouseX - centerX;
  let dy = mouseY - centerY;

  // 归一化方向向量
  let length = Math.sqrt(dx * dx + dy * dy);
  if (length > 0) {
    dx /= length;
    dy /= length;
  }

  // 更新重力方向
  gravityDirection.x = dx * 0.3; // 调整重力强度
  gravityDirection.y = dy * 0.3;
}

function mousePressed() {
  if (reset == 0) {
    stopped = !stopped;
    if (stopped) {
      digits.forEach(part => {
        part.body.plugin.lastPos = { x: part.body.position.x, y: part.body.position.y };
        Body.setStatic(part.body, false);
      });
    } else {
      reset = digits.length;
    }
  }
}