// 仕様
// 720x480

// いいよこれで。
// どうせどうでもいいコードでしょ
// スライダー、0.1刻みで-10～10いじれるようにして。

let spurPool;
let system;
let isLoop = true;

let activeSliderImg;
let inActiveSliderImg;
let cursorImg;
let colorBandImg;

const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

function preload(){
  // スライダー2つと色設定用のカーソルと色バンド
  // しばらくはダミー画像使ってください（色々めんどくさいので）
}

function setup(){
  createCanvas(760, 480);
  colorMode(HSB, 240);
  spurPool = new ObjectPool(() => { return new spur(); }, 2048);
  system = new visualizeSystem();
  //background(0);
}

function keyTyped(){
  if(key === 'p'){
    if(isLoop){ noLoop(); isLoop = false; return; }
    else{ loop(); isLoop = true; return; }
  }
}

function draw(){
  background(0);
  translate(240, 240);
  applyMatrix(1, 0, 0, -1, 0, 0);
  // 白線で座標軸 座標軸やめよう
  // spurを生成する（10fcごとにどこかにランダムで1個）
  system.update();
  system.createSpur();
  system.act();
  system.display();
  // コンフィグ
  system.drawConfig();
  //fill(0, 0, 100);
  //stroke(0);
	//text(spurPool.nextFreeSlot, 50, 50);
}

// ---------------------------------------------------------------------------------------- //
// visualize system.
class visualizeSystem{
  constructor(){
    this.unitArray = new CrossReferenceArray();
    this.spurArray = new CrossReferenceArray();
    this.setUnitInterval = 3;
    this.properFrameCount = 0; // パターン変更の際にリセットする感じ？
    this.elems = [0.1, 2.0, -2.0, 0.1]; // これを用いてbehaviorをセットする感じ
    this.unitLifespan = 60;
    this.spurLifespan = 60;
		this.pivotHue = 160; // 基準となる色
    this.bandWidth = 40; // 色幅（この幅を行ったり来たりする）
    this.diffHue = 0;
  }
  update(){
    this.properFrameCount++;
    if(this.properFrameCount % this.setUnitInterval === 0){ this.createUnit(); }
    this.spurArray.every("update");
    this.unitArray.every("update");
  }
  createUnit(){
    // ユニットを生成する
    this.diffHue++;
    if(this.diffHue > 2 * this.bandWidth){ this.diffHue -= 2 * this.bandWidth; }
    let hue = (this.pivotHue + this.diffHue) % 240;
    if(this.diffHue > this.bandWidth){ hue = (this.pivotHue + 2 * this.bandWidth - this.diffHue) % 240; }
    let x = (random(1) * 2 - 1) * 240;
    let y = (random(1) * 2 - 1) * 240;
    let toX = this.elems[0] * x + this.elems[1] * y;
    let toY = this.elems[2] * x + this.elems[3] * y;
    let vx = (toX - x) / this.unitLifespan;
    let vy = (toY - y) / this.unitLifespan;
    let newUnit = new unit(hue);
    newUnit.setPosition(x, y)
           .setVelocity(vx, vy)
           .setBehavior([timeLimitVanish(this.unitLifespan), fail]);
    this.unitArray.add(newUnit);
  }
  createSpur(){
    // シュプールを生成する
    this.unitArray.forEach(
      (u) => {
        let newSpur = spurPool.use();
    		newSpur.setting(u.position, u.prevPosition, u.hue, this.spurLifespan);
    		this.spurArray.add(newSpur);
      }
    )
  }
  act(){
    this.unitArray.every("act");
  }
  display(){
    this.spurArray.every("display");
  }
  drawConfig(){
    textAlign(CENTER, CENTER);
    textSize(20);
    fill(0, 0, 240);
    stroke(0);
    applyMatrix(1, 0, 0, -1, 0, 0);
    text(this.elems[0].toFixed(1), 300, -180);
    text(this.elems[1].toFixed(1), 380, -180);
    text(this.elems[2].toFixed(1), 300, -100);
    text(this.elems[3].toFixed(1), 380, -100);
  }
}

// ---------------------------------------------------------------------------------------- //
// unit.

class unit{
	constructor(hue){
		this.position = createVector();
		this.prevPosition = createVector();
		this.velocity = createVector();
		this.properFrameCount = 0;
		this.behaviorList = [];
    this.hue = hue;
	}
	setPosition(x, y){
		this.position.set(x, y);
		return this;
	}
	setVelocity(vx, vy){
		this.velocity.set(vx, vy);
		return this;
	}
	setPolarVelocity(radius, direction){
		this.velocity.set(radius * cos(direction), radius * sin(direction));
		return this;
	}
	setBehavior(behaviorList){
		this.behaviorList = behaviorList;
		return this;
	}
	setSpurLifespan(spurLifespan){
		this.spurLifespan = spurLifespan;
		return this;
	}
	update(){
		this.prevPosition.set(this.position.x, this.position.y);
		this.position.add(this.velocity);
		this.properFrameCount++;
	}
	act(){
		/* act behavior */
		this.behaviorList.forEach((behavior) => { behavior(this); });
	}
	remove(){
		this.belongingArray.remove(this);
	}
}

// ---------------------------------------------------------------------------------------- //
// Spur.

class spur{
	constructor(){
	}
	setting(pos, prevPos, hue, lifespanFrameCount){
		this.startX = pos.x;
		this.startY = pos.y;
		this.endX = prevPos.x;
		this.endY = prevPos.y;
		this.hue = hue;
		this.lifespanFrameCount = lifespanFrameCount;
		this.coefficient = 240 / lifespanFrameCount;
	}
	remove(){
		this.belongingArray.remove(this);
		spurPool.recycle(this);
	}
	update(){
		this.lifespanFrameCount--;
		if(this.lifespanFrameCount < 0){ this.remove(); }
	}
	display(){
		strokeWeight(3);
    let saturation = this.lifespanFrameCount * this.coefficient;
		stroke(this.hue, saturation, 240, saturation);
		line(this.startX, this.startY, this.endX, this.endY);
	}
}


// ---------------------------------------------------------------------------------------- //
// ObjectPool.

// ObjectPoolはどこで使っているかというと、particleの取得時。いじるのは取得時と破棄時。
// 作るときにgrow, 取得時にuse, 破棄時にrecycleを使うように書き換えればOK.
// particlePoolはParticleSetが持ってるからそっちでクラス化しようね

// 個別のイニシャライズ処理は汎用性が落ちるので廃止。取得してからinitializeするように書き換え。

class ObjectPool{
	constructor(objectFactory = (() => ({})), initialSize = 0){
		this.objPool = [];
		this.nextFreeSlot = null; // 使えるオブジェクトの存在位置を示すインデックス
		this.objectFactory = objectFactory;
		this.grow(initialSize);
	}
	use(){
		if(this.nextFreeSlot == null || this.nextFreeSlot == this.objPool.length){
		  this.grow(this.objPool.length || 5); // 末尾にいるときは長さを伸ばす感じ。lengthが未定義の場合はとりあえず5.
		}
		let objToUse = this.objPool[this.nextFreeSlot]; // FreeSlotのところにあるオブジェクトを取得
		this.objPool[this.nextFreeSlot++] = EMPTY_SLOT; // その場所はemptyを置いておく、そしてnextFreeSlotを一つ増やす。
    //objToUse.initialize(); // 個別のイニシャライズ処理を追加
		return objToUse; // オブジェクトをゲットする
	}
	recycle(obj){
		if(this.nextFreeSlot == null || this.nextFreeSlot == -1){
			this.objPool[this.objPool.length] = obj; // 図らずも新しくオブジェクトが出来ちゃった場合は末尾にそれを追加
		}else{
			// 考えづらいけど、this.nextFreeSlotが0のときこれが実行されるとobjPool[-1]にobjが入る。
			// そのあとでrecycleが発動してる間は常に末尾にオブジェクトが増え続けるからFreeSlotは-1のまま。
			// そしてuseが発動した時にその-1にあったオブジェクトが使われてそこにはEMPTY_SLOTが設定される
			this.objPool[--this.nextFreeSlot] = obj;
		}
	}
	grow(count = this.objPool.length){ // 長さをcountにしてcount個のオブジェクトを追加する
		if(count > 0 && this.nextFreeSlot == null){
			this.nextFreeSlot = 0; // 初期状態なら0にする感じ
		}
		if(count > 0){
			let curLen = this.objPool.length; // curLenはcurrent Lengthのこと
			this.objPool.length += Number(count); // countがなんか変でも数にしてくれるからこうしてるみたい？"123"とか。
			// こうするとかってにundefinedで伸ばされるらしい・・長さプロパティだけ増やされる。
			// 基本的にはlengthはpushとか末尾代入（a[length]=obj）で自動的に増えるけどこうして勝手に増やすことも出来るのね。
			for(let i = curLen; i < this.objPool.length; i++){
				// add new obj to pool.
				this.objPool[i] = this.objectFactory();
			}
			return this.objPool.length;
		}
	}
	size(){
		return this.objPool.length;
	}
}

// ---------------------------------------------------------------------------------------- //
// Slider.
// あくまでスライダーは上下もしくは左右に動くオブジェクトで動く範囲が制限されており、
// なおかつ何かしらの値を返すものである。
// 動かせるオブジェクトはカーソルと呼ばれて画像を貼り付ける。
// とりあえずダミー。
// hit(x, y)のxとyにmouseClickedのときのxとyを入れて調べてOKが出たらactivateされて
// その間にマウスを動かすとカーソルが動いて値が変わる、
// マウスを離すとinActivateされて更新が止まる。

// 4つの要素に対応した4つと、色をいじる3角形が2つ（バンドを定める）
// 4つは240個の・・うん。3と6と12を考えている。いじれるようにする。0.1刻みで変更可能。
// -3～3, -6～6, -12～12. クリックで順繰りに。

class slider{
  constructor(typeName, minValue, maxValue, bodyPos, ltPos, rdPos, offSetX, offSetY){
    this.typeName = typeName; // "vertical"（垂直）か"horizontal"（水平）。
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.bodyPos = bodyPos;
    this.ltPos = ltPos; // 左上
    this.rdPos = rdPos; // 右下
    this.sliderPos = ltPos;
    // activeのとき、横ならmouseX, 縦ならmouseYに応じて動く。あれが。
    this.active = false;
    // スライダーオブジェクトの位置と貼り付ける画像の左上との間のずれを修正する付加情報
    this.offSetX = offSetX;
    this.offSetY = offSetY;
  }
  hit(x, y){
    // クリック位置がカーソルを・・・
    if(this.typeName == "vertical"){ // たて
      return dist(x, y, this.bodyPos, this.sliderPos) < 10;
    }else if(this.typeName == "horizontal"){ // よこ
      return dist(x, y, this.sliderPos, this.bodyPos) < 10;
    }
  }
  activate(){
    this.active = true;
  }
  inActivate(){
    this.active = false;
  }
  setMinValue(newMinValue){
    this.minValue = newMinValue; // min値の変更
  }
  setMaxValue(newMaxValue){
    this.maxValue = newMaxValue; // maxの変更
  }
  update(){
    if(this.active){
      if(this.typeName == "vertical"){ // たて
        this.sliderPos = constrain(mouseY, this.ltPos, this.rdPos);
      }else if(this.typeName == "horizontal"){ // よこ
        this.sliderPos = constrain(mouseX, this.ltPos, this.rdPos);
      }
    }
  }
  display(){
    if(this.typeName == "vertical"){ // たて
      (this.active ? fill(0, 240, 240) : fill(180, 240, 240));
      noStroke();
      ellipse(this.bodyPos, this.sliderPos, 40, 40);
    }else if(this.typeName == "horizontal"){ // よこ
      (this.active ? fill(0, 240, 240) : fill(180, 240, 240));
      noStroke();
      ellipse(this.sliderPos, this.bodyPos, 20, 20);
    }
  }
  getValue(){
    return map(this.sliderPos, this.ltPos, this.rdPos, this.minValue, this.maxValue);
  }
}

// ---------------------------------------------------------------------------------------- //
// Cross Reference Array.

// 配列クラスを継承して、要素を追加するときに自動的に親への参照が作られるようにしたもの
class CrossReferenceArray extends Array{
	constructor(){
    super();
	}
  add(element){
    this.push(element);
    element.belongingArray = this; // 所属配列への参照
  }
  remove(element){
    let index = this.indexOf(element, 0);
    this.splice(index, 1); // elementを配列から排除する
  }
  every(methodName){
    // methodNameには"update"とか"display"が入る。まとめて行う処理。
    this.forEach((obj) => { obj[methodName](); });
  }
}

// ---------------------------------------------------------------------------------------- //
// Behavior.

// 自然消滅
function timeLimitVanish(limit){
	return (obj) => { if(obj.properFrameCount > limit){ obj.remove(); } }
}

// 画面外で消滅
function fail(obj){
	if(obj.position.x < -240 || obj.position.x > 240 || obj.position.y < -240 || obj.position.y > 240){ obj.remove(); }
}
