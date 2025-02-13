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
let showColon = true; // 控制冒号显示

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
  walls.push(new BlockCore(world, { x: -30, y: height / 2, w: 60, h: height, color: 'black' }, { isStatic: true }));
  walls.push(new BlockCore(world, { x: width + 30, y: height / 2, w: 60, h: height, color: 'black' }, { isStatic: true }));
  walls.push(new BlockCore(world, { x: width / 2, y: -30, w: width, h: 60, color: 'black' }, { isStatic: true }));
  walls.push(new BlockCore(world, { x: width / 2, y: height + 30, w: width, h: 60, color: 'black' }, { isStatic: true }));

  // 初始化鼠标交互
  mouse = new Mouse(engine, canvas, { stroke: 'white', strokeWeight: 2 });

  // 加载 SVG 数字部件
  new BlocksFromSVG(world, 'Segments_Ziffern.svg', [],
    { isStatic: true, restitution: 0.7, friction: 0.0, frictionAir: 0.002 },
    {
      save: false, sample: 10, offset: { x: 0, y: 0 }, done: (added, time, fromCache) => {
        for (let id in added) {
          const idx = id.substring(3, 4);
          added[id].attributes.stroke = 'rgb(0,79,79)';
          if (added[id].body) {
            if (!ziffernParts[idx]) {
              ziffernParts[idx] = [added[id]];
            } else {
              ziffernParts[idx].push(added[id]);
            }
            World.remove(world, added[id].body);
            added[id].attributes.color = 'rgb(0,79,79)';
          } else {
            console.log('Ziffern Teil ' + id + ' ist fehlerhaft');
          }
        }
      }
    });

  // 启动 Matter.js 引擎
  Runner.run(engine);

  // 添加设备方向事件监听器（仅用于移动端）
  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ 需要请求权限
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(console.error);
    } else {
      // 其他设备直接监听事件
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }
}

function handleOrientation(event) {
  // 获取设备的倾斜数据
  const beta = event.beta; // 前后倾斜（-180 到 180）
  const gamma = event.gamma; // 左右倾斜（-90 到 90）

  // 将倾斜数据映射到重力方向
  gravityDirection.x = gamma / 90; // 左右倾斜控制 x 方向重力
  gravityDirection.y = beta / 90; // 前后倾斜控制 y 方向重力

  // 限制重力方向的范围
  gravityDirection.x = Math.min(Math.max(gravityDirection.x, -1), 1);
  gravityDirection.y = Math.min(Math.max(gravityDirection.y, -1), 1);
}

function draw() {
  background(0);

  // 更新重力方向
  engine.world.gravity.x = gravityDirection.x;
  engine.world.gravity.y = gravityDirection.y;

    // 这里可以动态调整速度，比如加速到 2 倍
    engine.timing.timeScale = 1.2;


  if (!stopped) {
    if (reset > 0) {
      magnets.forEach(list => list.forEach(magnet => {
        const body = magnet.attracted[0];
        if (!body.isStatic) {
          body.collisionFilter = cfPass;
          magnet.attract();
          const d = dist(magnet.body.position.x, magnet.body.position.y, body.position.x, body.position.y);
          if (d < 60) {
            reset--;
            Matter.Body.setPosition(body, body.plugin.lastPos);
            Matter.Body.setStatic(body, true);
            Matter.Body.setAngle(body, 0);


            Matter.Body.setAngularVelocity(body, 0);  // **防止继续旋转**


            body.collisionFilter = cfHit;
          }
        }
      }));
    } else {
      clock();
    }
  }

  // 绘制所有数字部件
  digits.forEach(part => part.draw());

  // 绘制地面和墙壁
  ground.draw();
  walls.forEach(wall => wall.draw());

  // 绘制鼠标交互
  mouse.draw();

  // 绘制冒号
  if (showColon) {
    fill(0, 79, 79);
    noStroke();
    ellipse(440, 350, 45, 45);
    ellipse(440, 450, 45, 45);
  }
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
        x: clone.body.position.x, y: clone.body.position.y, r: 20,
        color: 'blue',
        attraction: 1.6e-4
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

function keyPressed() {
  // 保留原有的键盘控制功能
  if (keyCode === LEFT_ARROW) {
    gravityDirection = { x: -1, y: 0 };
  } else if (keyCode === RIGHT_ARROW) {
    gravityDirection = { x: 1, y: 0 };
  } else if (keyCode === UP_ARROW) {
    gravityDirection = { x: 0, y: -1 };
  } else if (keyCode === DOWN_ARROW) {
    gravityDirection = { x: 0, y: 1 };
  }
}

function mousePressed() {
  // 保留原有的鼠标点击功能
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
    showColon = !showColon;
  }
}