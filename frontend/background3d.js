var sketchProc = function(processingInstance) {
    processingInstance.size(600, 600);

    var scene;

    var Scene = function() {
        this.speed = -0.3;
        this.fishes = [];
        this.bubbles = [];
        this.algae = [];
        this.auto = true;
        this.sceneBack = this.getSceneBack();
        this.sceneFront = this.getSceneFront();
        this.rays = this.getRays();
        this.plant = null;
        this.maxFish = 4;
    };

    var Fish = function(config) {
        this.position = config.position || new processingInstance.PVector(processingInstance.random(processingInstance.width), processingInstance.random(processingInstance.height));
        this.velocity = new processingInstance.PVector(0, 0);
        this.acceleration = new processingInstance.PVector(0, 0);

        this.scale = config.scale || 1;
        this.direction = -1;
        this.change = false;
        this.xOffset = 0;

        this.follow = config.follow || false;

        this.segmentSizes = [
            0, 2, 3, 4, 5, 5.5, 6, 6.5, 7, 7.3,
            7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5,
            2, 1.5, 1, 0, 0, 0, 0, 0
        ];

        this.segments = [];
        for (var i = 0; i < this.segmentSizes.length; i++) {
            this.segments.push(new processingInstance.PVector(0, 0));
        }

        this.segmentLength = processingInstance.floor(processingInstance.random(5, 7));

        this.colors = [];
        this.colors.push(config.color1 || processingInstance.color(processingInstance.random(255), processingInstance.random(255), processingInstance.random(255), processingInstance.random() < 0.5 ? processingInstance.random(100, 200) : 255));
        this.colors.push(config.color2 || processingInstance.color(processingInstance.random(255), processingInstance.random(255), processingInstance.random(255), processingInstance.random() < 0.5 ? processingInstance.random(100, 200) : 255));
        this.colors.push(config.color3 || processingInstance.color(processingInstance.random(255), processingInstance.random(255), processingInstance.random(255), processingInstance.random() < 0.5 ? processingInstance.random(100, 200) : 255));

        this.food = new processingInstance.PVector(0, 0);
    };

    Fish.prototype.update = function() {
        if (scene.auto === false && this.follow) {
            this.food = new processingInstance.PVector(processingInstance.mouseX, processingInstance.mouseY);
        }
        var dir = processingInstance.PVector.sub(this.food, this.position);
        dir.normalize();
        dir.mult(0.1);
        this.acceleration = dir;
        this.velocity.add(this.acceleration);
        this.velocity.limit(4);
        this.position.add(this.velocity);
    };

    Fish.prototype.calculate = function(i, segment) {
        var dx = segment.x - this.segments[i].x;
        var dy = segment.y - this.segments[i].y;
        var angle = processingInstance.atan2(dy, dx);
        if (i <= 21) {
            this.segments[i].x = segment.x - processingInstance.cos(angle) * this.segmentLength * this.scale;
            this.segments[i].y = segment.y - processingInstance.sin(angle) * this.segmentLength * this.scale;
        } else {
            this.segments[i].x = segment.x - processingInstance.cos(angle) * this.segmentLength * 0.7 * this.scale;
            this.segments[i].y = segment.y - processingInstance.sin(angle) * this.segmentLength * 0.7 * this.scale;
        }
    };

    Fish.prototype.display = function(i) {
        processingInstance.pushMatrix();
        processingInstance.pushStyle();
        processingInstance.rectMode(processingInstance.CENTER);
        processingInstance.translate(this.segments[i].x, this.segments[i].y);
        processingInstance.scale(this.scale);

        var segColor = this.colors[i % this.colors.length];

        processingInstance.noStroke();
        processingInstance.fill(segColor);
        processingInstance.ellipse(this.segmentSizes[i], -this.segmentSizes[i], this.segmentSizes[i] * 4.5, this.segmentSizes[i] * 8);

        if (i === 3) {
            processingInstance.stroke(36, 36, 36);
            processingInstance.strokeWeight(3);
            processingInstance.ellipse(this.segmentSizes[i] * 3.2, -this.segmentSizes[i] * 2, 2, 2);
            processingInstance.ellipse(-this.segmentSizes[i] * 1.1, -this.segmentSizes[i] * 2, 2, 2);
        }

        processingInstance.noStroke();

        if (i >= 6 && i <= 15) {
            processingInstance.rect(-this.segmentSizes[i] * -0.8, -this.segmentSizes[i] * 6, 1, processingInstance.pow((this.segmentSizes[i] * 0.5), 2.6));
        }

        if (i >= 7 && i <= 10) {
            processingInstance.rect(-this.segmentSizes[i] * -0.8, -this.segmentSizes[i] * -4, 1, processingInstance.pow((this.segmentSizes[i] * 0.5), 2.2));
        }

        if (i >= 5 && i <= 7) {
            processingInstance.rect(-this.segmentSizes[i] * 2, -this.segmentSizes[i] * 0.5, this.segmentSizes[i] * 4, 1);
            processingInstance.rect(-this.segmentSizes[i] * -4, -this.segmentSizes[i] * 0.5, this.segmentSizes[i] * 4, 1);
        }

        if (i > 21) {
            processingInstance.fill(this.colors[0]);
            processingInstance.rect(0, 0, 3, 10 * (i - 21));
        }
        processingInstance.popStyle();
        processingInstance.popMatrix();
    };

    Fish.run = function() {
        for (var i = 0; i < scene.fishes.length; i++) {
            var fish = scene.fishes[i];

            if (scene.auto === true && fish.change === true) {
                fish.food = new processingInstance.PVector(fish.xOffset, fish.position.y);
                if ((fish.xOffset === -70 && fish.position.x < fish.xOffset) || (fish.xOffset === processingInstance.width + 70 && fish.position.x > fish.xOffset)) {
                    fish.direction *= -1;
                    fish.scale = processingInstance.constrain(fish.scale - 0.001 * fish.direction, 0.5, 1);
                    fish.change = false;
                }
            } else if (processingInstance.random() < 0.05) {
                fish.food = new processingInstance.PVector(processingInstance.random(processingInstance.width), processingInstance.random(processingInstance.height));
            }

            fish.update();

            if (scene.auto === false && fish.follow) {
                fish.direction = -1;
            }

            if (fish.change === false && (fish.scale === 0.5 || fish.scale === 1)) {
                if (processingInstance.random() < 0.5) {
                    fish.xOffset = -70;
                } else {
                    fish.xOffset = processingInstance.width + 70;
                }
                fish.change = true;
            }

            fish.scale = processingInstance.constrain(fish.scale - 0.001 * fish.direction, 0.5, 1);

            fish.calculate(0, fish.position);
            for (var j = 0; j < fish.segments.length - 1; j++) {
                fish.calculate(j + 1, fish.segments[j]);
            }

            if (fish.direction === -1) {
                for (var k = fish.segments.length - 1; k >= 0; k--) {
                    fish.display(k);
                }
            } else {
                for (var k = 0; k < fish.segments.length; k++) {
                    fish.display(k);
                }
            }
        }

        var len = scene.fishes.length;
        for (var i = len - 1; i >= 0; i--) {
            for (var j = 1; j <= i; j++) {
                if (scene.fishes[j - 1].scale > scene.fishes[j].scale) {
                    var temp = scene.fishes[j - 1];
                    scene.fishes[j - 1] = scene.fishes[j];
                    scene.fishes[j] = temp;
                }
            }
        }
    };

    var Bubble = function(position, size) {
        this.position = position || new processingInstance.PVector(processingInstance.random(30, 70), processingInstance.height);
        this.velocity = new processingInstance.PVector(0, 0);
        this.acceleration = new processingInstance.PVector(0, 0);
        this.size = size || processingInstance.random(5, 20);
        this.color = processingInstance.random(100, 200);
    };

    Bubble.prototype.update = function() {
        var target = new processingInstance.PVector(this.position.x, -this.size);
        var dir = processingInstance.PVector.sub(target, this.position);
        dir.normalize();
        dir.mult(0.1);
        this.acceleration = dir;
        this.velocity.add(this.acceleration);
        this.velocity.limit(processingInstance.random(0.5, 1));
        this.position.add(this.velocity);
    };

    Bubble.prototype.display = function() {
        processingInstance.fill(this.color, this.color, this.color, 20);
        processingInstance.noStroke();
        processingInstance.ellipse(this.position.x, this.position.y, this.size, this.size);
    };

    Bubble.run = function() {
        for (var i = scene.bubbles.length - 1; i >= 0; i--) {
            var bubble = scene.bubbles[i];

            bubble.update();
            bubble.display();

            if (bubble.position.y < -bubble.size) {
                scene.bubbles.splice(i, 1);
            }
        }

        if (processingInstance.random(1) < 0.01) {
            scene.bubbles.push(new Bubble());
        }
    };

    var Plant = function() {
        this.x = 0;
        this.offset = 150;
        this.theta = 0.0;
        this.amplitude = 20.0;
        this.dy = 0.0;
        this.color = processingInstance.color(69, 11, 66);
    };

    Plant.prototype.display = function() {
        processingInstance.stroke(0, 0, 0, 100);
        processingInstance.strokeWeight(3);
        processingInstance.noFill();

        this.theta += 0.01;
        this.dy = processingInstance.cos(this.theta) * this.amplitude;

        this.x = this.dy + this.offset;

        processingInstance.beginShape();
        processingInstance.vertex(this.offset, 600);
        processingInstance.bezierVertex(this.x - 15, 566, this.x - 15, 533, this.x - 10, 500);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(this.offset, 600);
        processingInstance.bezierVertex(this.x - 12, 570, this.x - 12, 560, this.x - 8, 550);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(this.offset, 600);
        processingInstance.bezierVertex(this.x - 15, 566, this.x + 15, 533, this.x + 10, 520);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(this.offset, 600);
        processingInstance.bezierVertex(this.x + 20, 566, this.x + 25, 533, this.x + 15, 480);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(this.offset, 600);
        processingInstance.bezierVertex(this.x + 25, 566, this.x + 35, 553, this.x + 40, 540);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(this.offset, 600);
        processingInstance.bezierVertex(this.x - 35, 580, this.x - 25, 570, this.x - 30, 560);
        processingInstance.endShape();

        processingInstance.fill(this.color);
        processingInstance.noStroke();
        processingInstance.ellipse(this.x - 10, 500, 12, 12);
        processingInstance.ellipse(this.x - 8, 550, 10, 10);
        processingInstance.ellipse(this.x + 10, 520, 10, 10);
        processingInstance.ellipse(this.x + 15, 480, 14, 14);
        processingInstance.ellipse(this.x + 40, 540, 12, 12);
        processingInstance.ellipse(this.x - 30, 560, 10, 10);
    };

    Scene.prototype.getSceneBack = function() {
        processingInstance.background(0, 0, 0, 0);

        processingInstance.noFill();
        processingInstance.stroke(18, 18, 18, 80);

        processingInstance.strokeWeight(4);
        processingInstance.beginShape();
        processingInstance.vertex(10, 490);
        processingInstance.vertex(35, 430);
        processingInstance.vertex(45, 395);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(10, 490);
        processingInstance.vertex(10, 460);
        processingInstance.vertex(15, 400);
        processingInstance.endShape();

        processingInstance.strokeWeight(3);
        processingInstance.beginShape();
        processingInstance.vertex(10, 490);
        processingInstance.vertex(20, 450);
        processingInstance.vertex(20, 420);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(10, 490);
        processingInstance.vertex(25, 470);
        processingInstance.vertex(40, 450);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(10, 490);
        processingInstance.vertex(5, 470);
        processingInstance.vertex(2, 430);
        processingInstance.endShape();

        processingInstance.noFill();
        processingInstance.stroke(18, 18, 18, 80);

        processingInstance.strokeWeight(3);
        processingInstance.beginShape();
        processingInstance.vertex(300, 510);
        processingInstance.vertex(303, 485);
        processingInstance.vertex(300, 470);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(300, 510);
        processingInstance.vertex(296, 485);
        processingInstance.vertex(294, 477);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(305, 510);
        processingInstance.vertex(290, 495);
        processingInstance.vertex(285, 488);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(300, 510);
        processingInstance.vertex(307, 495);
        processingInstance.vertex(312, 488);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(300, 510);
        processingInstance.vertex(295, 495);
        processingInstance.vertex(290, 488);
        processingInstance.endShape();

        processingInstance.noStroke();

        processingInstance.fill(20, 63, 99);
        processingInstance.beginShape();
        processingInstance.vertex(0, 480);
        processingInstance.bezierVertex(150, 470, 200, 510, 250, 520);
        processingInstance.bezierVertex(600, 600, 600, 600, 600, 600);
        processingInstance.vertex(0, 600);
        processingInstance.vertex(0, 480);
        processingInstance.endShape();

        processingInstance.fill(16, 60, 89);
        processingInstance.beginShape();
        processingInstance.vertex(0, 600);
        processingInstance.bezierVertex(300, 450, 400, 500, 600, 550);
        processingInstance.vertex(600, 600);
        processingInstance.vertex(0, 600);
        processingInstance.endShape();

        processingInstance.fill(22, 55, 82);
        processingInstance.beginShape();
        processingInstance.vertex(0, 510);
        processingInstance.bezierVertex(100, 520, 200, 530, 300, 600);
        processingInstance.vertex(0, 600);
        processingInstance.vertex(0, 510);
        processingInstance.endShape();

        processingInstance.fill(10, 53, 74);
        processingInstance.beginShape();
        processingInstance.vertex(600, 490);
        processingInstance.bezierVertex(400, 480, 300, 550, 200, 600);
        processingInstance.vertex(600, 600);
        processingInstance.vertex(600, 490);
        processingInstance.endShape();

        return processingInstance.get(0, 0, processingInstance.width, processingInstance.height);
    };

    Scene.prototype.getSceneFront = function() {
        processingInstance.background(0, 0, 0, 0);

        processingInstance.noFill();
        processingInstance.stroke(18, 18, 18, 200);
        processingInstance.strokeWeight(8);

        processingInstance.beginShape();
        processingInstance.vertex(600, 600);
        processingInstance.vertex(590, 440);
        processingInstance.vertex(575, 350);
        processingInstance.endShape();

        processingInstance.strokeWeight(15);
        processingInstance.beginShape();
        processingInstance.vertex(600, 600);
        processingInstance.vertex(560, 430);
        processingInstance.vertex(550, 300);
        processingInstance.endShape();

        processingInstance.strokeWeight(12);
        processingInstance.beginShape();
        processingInstance.vertex(600, 600);
        processingInstance.vertex(570, 430);
        processingInstance.vertex(530, 320);
        processingInstance.endShape();

        processingInstance.beginShape();
        processingInstance.vertex(570, 600);
        processingInstance.vertex(540, 480);
        processingInstance.vertex(500, 410);
        processingInstance.endShape();

        processingInstance.noStroke();
        processingInstance.fill(8, 47, 69);
        processingInstance.beginShape();
        processingInstance.vertex(0, 550);
        processingInstance.bezierVertex(300, 510, 500, 550, 600, 570);
        processingInstance.vertex(600, 600);
        processingInstance.vertex(0, 600);
        processingInstance.vertex(0, 550);
        processingInstance.endShape();

        return processingInstance.get(0, 0, processingInstance.width, processingInstance.height);
    };

    Scene.prototype.getRays = function() {
        processingInstance.background(0, 0, 0, 0);

        processingInstance.noFill();
        processingInstance.stroke(255, 255, 255, 20);
        var j = 250;

        for (var i = -150; i < 800; i += 20) {
            processingInstance.strokeWeight(processingInstance.random(2, 10));
            processingInstance.line(j, -50, i, processingInstance.height);
            j += 5;
        }

        processingInstance.filter(processingInstance.BLUR, 12);

        return processingInstance.get(0, 0, processingInstance.width, processingInstance.height);
    };

    Scene.prototype.init = function() {
        this.fishes.push(new Fish({
            color1: processingInstance.color(255, 87, 51),
            color2: processingInstance.color(255, 195, 0),
            color3: processingInstance.color(243, 156, 18),
            scale: processingInstance.random(0.6, 0.8),
            follow: true
        }));

        this.fishes.push(new Fish({
            scale: processingInstance.random(0.6, 0.8)
        }));

        this.plant = new Plant();
    };

    Scene.run = function() {
        processingInstance.background(27, 95, 135);
        processingInstance.image(scene.sceneBack, 0, 0);
        Fish.run();
        processingInstance.image(scene.sceneFront, 0, 0);
        scene.plant.display();
        processingInstance.image(scene.rays, 0, 0);
        Bubble.run();
    };

    scene = new Scene();
    scene.init();

    processingInstance.draw = function() {
        Scene.run();
    };

    processingInstance.mouseClicked = function() {
        if (scene.fishes.length < scene.maxFish) {
            scene.fishes.push(new Fish({
                position: new processingInstance.PVector(processingInstance.mouseX, processingInstance.mouseY),
                scale: processingInstance.random(0.6, 1)
            }));
        }
    };

    processingInstance.mouseOver = function() {
        scene.auto = false;
    };

    processingInstance.mouseOut = function() {
        scene.auto = true;
    };
};