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
let gravityDirection = { x: 0, y: 0.3 }; // Default gravity pointing down
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

  ground = new BlockCore(
    world,
    { x: 400, y: height + 10, w: width, h: 20, color: 'white' },
    { isStatic: true }
  );

  walls.push(new BlockCore(world, { x: -30, y: height / 2, w: 60, h: height, color: 'black' }, { isStatic: true }));
  walls.push(new BlockCore(world, { x: width + 30, y: height / 2, w: 60, h: height, color: 'black' }, { isStatic: true }));
  walls.push(new BlockCore(world, { x: width / 2, y: -30, w: width, h: 60, color: 'black' }, { isStatic: true }));
  walls.push(new BlockCore(world, { x: width / 2, y: height + 30, w: width, h: 60, color: 'black' }, { isStatic: true }));

  mouse = new Mouse(engine, canvas, { stroke: 'white', strokeWeight: 2 });

  new BlocksFromSVG(world, 'Segments_Ziffern.svg', [],
    { isStatic: true, restitution: 0.7, friction: 0.0, frictionAir: 0.0 },
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
            added[id].attributes.color = 'rgb