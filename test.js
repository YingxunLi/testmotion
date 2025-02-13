/*
VSCode Find/Replace mit .*
<g id="([^"]+)">\n    <path([^\n]+)\n  </g>
<path id="$1"$2
<g id="([^"]+)">\n    <polygon([^\n]+)\n  </g>
<polygon id="$1"$2
<g id="([^"]+)">\n    <rect([^\n]+)\n  </g>
<rect id="$1"$2
*/
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

// collisionFilter: {group: 0x00, category: 0b0000 0000 0000 0001, mask: 0b1111 1111 1111 1111}
// collision of A and B: group > 0 && groupA == groupB          ,
// no collision of A and B: group < 0 && groupA == groupB
// groupA != groupB: 
// collision of A and B ? (categoryA & maskB) !== 0 && (categoryB & maskA) !== 0
const cfHit = { group: 0, category: 0x0001, mask: 0xFFFFFFFF }
const cfPass = { group: -1, category: 0x0001, mask: 0x0000 }

function setup() {
  const canvas = createCanvas(960, 960);

  engine.gravity.y = 0;

  engine = Engine.create();
  world = engine.world;

  ground = new BlockCore(
    world,
    { x: 400, y: height + 10, w: width, h: 20, color: 'white' },
    { isStatic: true }
  );

  // Add walls
  // Aktualisierte Wände mit dreifacher Dicke
walls.push(new BlockCore(world, { x: -30, y: height / 2, w: 60, h: height, color: 'black' }, { isStatic: true })); // Linke Wand
walls.push(new BlockCore(world, { x: width + 30, y: height / 2, w: 60, h: height, color: 'black' }, { isStatic: true })); // Rechte Wand
walls.push(new BlockCore(world, { x: width / 2, y: -30, w: width, h: 60, color: 'black' }, { isStatic: true })); // Obere Wand
walls.push(new BlockCore(world, { x: width / 2, y: height + 30, w: width, h: 60, color: 'black' }, { isStatic: true })); // Untere Wand
  mouse = new Mouse(engine, canvas, { stroke: 'white', strokeWeight: 2 });

  // Die Ziffern werden 1x geladen werden und später durch kopieren verwendet
  // "save: true" speichert die Daten im Browser
  // wenn das SVG geändert wird, muss es 1x auf "save: false" gesetzt werden !!!
  new BlocksFromSVG(world, 'ZahlenBIG2.svg', [],
    { isStatic: true, restitution: 0.7, friction: 0.0, frictionAir: 0.0 },
    {
      save: false, sample: 10, offset: { x: 0, y: 0 }, done: (added, time, fromCache) => {
        console.log('FRAME', added, time, fromCache)
        for (let id in added) {
          const idx = id.substring(3, 4)
          added[id].attributes.stroke = 'rgb(0,79,79)'; // Neue Stroke-Farbe
          if (added[id].body) {
            if (!ziffernParts[idx]) {
              ziffernParts[idx] = [added[id]];
            } else {
              ziffernParts[idx].push(added[id]);
            }
            World.remove(world, added[id].body)
            added[id].attributes.color = 'rgb(0,79,79)'; // Neue Part-Farbe
          } else {
            console.log('Ziffern Teil ' + id + ' ist fehlerhaft')
          }
        }
      }
    });


  Runner.run(engine);
}

function clock() {
  if (ziffernParts.length == 10) {
    let actTime = [Math.floor(hour() / 10), hour() % 10, Math.floor(minute() / 10), minute() % 10]
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
  // Verschiebung für die Minuten (rechte Seite)
  const offsetX = (d === 2 || d === 3) ? 90 : 0;

  ziffernParts[z].forEach(part => {
    const clone = new PolygonFromSVG(world,
      {
        ...part.attributes, color: 'rgb(0,79,79)',
        fromVertices: part.attributes.fromVertices.map(v => ({ x: v.x + d * 200 + 20 + offsetX, y: v.y + 300 }))
      },
      { ...part.options, label: 'D' + d + z })
    digits.push(clone);
    
    const magnet = new Magnet(
      world,
      {
        x: clone.body.position.x, y: clone.body.position.y, r: 10,
        color: 'blue',
        attraction: 0.6e-4
      },
      { isStatic: true, isSensor: true })
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
    })
    magnets[d].forEach(magnet => World.remove(world, magnet.body));
    magnets[d] = [];
  }
}

function draw() {
  background(0);

  if (!stopped) {
    if (reset > 0) {
      magnets.forEach(list => list.forEach(magnet => {
        const body = magnet.attracted[0];
        if (!body.isStatic) {
          magnet.attract();
          const d = dist(magnet.body.position.x, magnet.body.position.y, body.position.x, body.position.y)
          if (d < 100) {
            reset--;
            Matter.Body.setPosition(body, body.plugin.lastPos);
            Matter.Body.setStatic(body, true);
            Matter.Body.setAngle(body, 0);
            // body.collisionFilter = cfHit;
          }
        } else {
          // body.collisionFilter = cfPass;
        }
      }));
    } else {
      clock();
    }
  }
  digits.forEach(part => part.draw());
  // magnets.forEach(list => list.forEach(magnet => magnet.draw()));
  ground.draw();
  walls.forEach(wall => wall.draw());

  mouse.draw();

  // Update gravity based on current direction
  engine.world.gravity.x = gravityDirection.x;
  engine.world.gravity.y = gravityDirection.y;

}

function keyPressed() {
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
  if (reset == 0) {
    stopped = !stopped;
    if (stopped) {
      digits.forEach(part => {
        part.body.plugin.lastPos = { x: part.body.position.x, y: part.body.position.y };
        Body.setStatic(part.body, false)
      });
    } else {
      reset = digits.length;
    }
  }
}

let showColon = true; // Variable zur Steuerung des Doppelpunkts

function draw() {
  background(0);

  if (!stopped) {
    if (reset > 0) {
      magnets.forEach(list => list.forEach(magnet => {
        const body = magnet.attracted[0];
        if (!body.isStatic) {
          // Deaktiviere die Kollision, solange der Magnet anzieht
          body.collisionFilter = cfPass;
          
          magnet.attract();
          const d = dist(magnet.body.position.x, magnet.body.position.y, body.position.x, body.position.y)
          if (d < 60) {
            reset--;
            Matter.Body.setPosition(body, body.plugin.lastPos);
            Matter.Body.setStatic(body, true);
            Matter.Body.setAngle(body, 0);
            
            // Reaktiviere die Kollision, sobald das Teil am Platz ist
            body.collisionFilter = cfHit;
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

  // Update gravity based on current direction
  engine.world.gravity.x = gravityDirection.x;
  engine.world.gravity.y = gravityDirection.y;
  
  // Zeichne den Doppelpunkt
  if (showColon) {
    fill(0,79,79);
    noStroke();
    ellipse(440, 350, 45, 45);
    ellipse(440, 450, 45, 45);
  }
}


  digits.forEach(part => part.draw());
  ground.draw();
  walls.forEach(wall => wall.draw());
  mouse.draw();

  // Update gravity based on current direction
  engine.gravity.x = (rotationY / 2 - engine.gravity.x) * 0.5;
  engine.gravity.y = (rotationX / 2 - engine.gravity.y) * 0.5;
  
  // Zeichne den Doppelpunkt
  if (showColon) {
    fill(255);
    noStroke();
    ellipse(440, 350, 45, 45);
    ellipse(440, 450, 45, 45);
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
    
    // Umschalten des Doppelpunkts
    showColon = !showColon;
  }
}