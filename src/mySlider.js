// 本格的に自作スライダーを使ってみる。
// HSB240に依存してる箇所があったので修正しました（色は事前に決めてね）
// 横スライダーと縦スライダーの線を描くことにした（備え付け）
// 色変更・・んー要相談。あんま増やしすぎるのもちょっとね。
// 値をキー値からダイレクトに取得できるようにしてください（めんどくさい）→できました。
// 実験：透明度を追加するとか（で、画像を別に用意してみるとか）

// 今背景色でやってるのを特定のオブジェクト、図形の色として、で、まあ・・いいや。

// これとは別に作りたいものがあるのでアイデア書いておく
// 三角形のブレット（以前作った）を使ってFALさんのブレットパターンと組み合わせてなんか作りたい
// カラースライダーを動かして特定のRGB配列にした時だけブレットパターンが変わる（インターバルとか方向決定などなど）
// そうでない時はデフォルト、一定フレームごとに1発ずつ発射する感じ
// たとえば特定の赤、特定の青、特定の緑、あるいはゾロ目のときなど。
// で、弧状スライダーで方向をいじったりできたら面白いよね。つまりホーミングは無し。だいぶ変わっちゃうかな・・
// ていうかあっちはさ、向こうもこっちも同じメソッドだからこそのホーミングでしょ、こっちが撃つなら要らんやん。以上。

// というわけでArcSliderとCircleSliderを作ってね。
// あと、あっちのスライダー、線上をクリックしてもActivateされる仕組みになってる・・
// めんどくさいな。そうだね、hitの仕様やめるか・・代わりにマージン用意して、スライダーベースでactivate判定するとか。うん。
// そうなるとスライダーごとに当たり判定作ったりしないといけないわね。
// 今スライダーのhitからカーソルのhitに移行してるけどここを個別処理にしてマージンがどうのこうのってやれば良さそう。
// 三角形のあれこれとかも必要なくなるしコードが簡潔になるのはいいよね。

// とりあえずキー名をスライダー作るときに登録しちゃおうね。後付けだと増やせない。

// クラス名のイニシャルは大文字がいいよね。
let controller; // SliderSetのエイリアスとしてcontrollerを定着させたい感じ。
let backgroundColor;

function setup() {
	createCanvas(360, 360);
	noStroke();
	preparation();
	backgroundColor = color(0);
}

function draw() {
	background(backgroundColor);
	controller.update();
	controller.display();
	textAlign(CENTER, CENTER);
	textSize(20);
  fill(255);
	text(controller.red, 310, 40);
	text(controller.green, 310, 80);
	text(controller.blue, 310, 120);
	if(controller.active){
		backgroundColor = color(controller.red, controller.green, controller.blue); // いぇい、成功！！
	}
}

function preparation(){
	controller = new SliderSet();
	let cursor1 = new RectCursor(8, 16);
	cursor1.setColor(color(249, 176, 180), color(237, 28, 36));
	let slider1 = new HorizontalSlider("red", 0, 255, cursor1, 40, 20, 275);
	let cursor2 = new RectCursor(8, 16);
	cursor2.setColor(color(180, 241, 198), color(34, 177, 76));
	let slider2 = new HorizontalSlider("green", 0, 255, cursor2, 80, 20, 275);
	let cursor3 = new RectCursor(8, 16);
	cursor3.setColor(color(197, 200, 239), color(63, 72, 204));
	let slider3 = new HorizontalSlider("blue", 0, 255, cursor3, 120, 20, 275);
	controller.registMulti([slider1, slider2, slider3]);
	//controller.registKeyMulti(["red", "green", "blue"]);
}

// ---------------------------------------------------------------------------------------- //
// interaction.

function mousePressed(){
	controller.activate();
}

function mouseReleased(){
	controller.inActivate();
}

function touchStarted(){
	controller.activate();
	//return false;
}

function touchEnded(){
	controller.inActivate();
	//return false;
}

// ---------------------------------------------------------------------------------------- //
// Slider and Cursor.

class Slider{
  constructor(key, minValue, maxValue, cursor){
    this.key = key; // 作るときにキーを
    this.minValue = minValue;
    this.maxValue = maxValue;
    // 円とか三角形とか。offSetは要らないかも。三角形はベクトルでやる。四角形はいわずもがな。
    this.cursor = cursor;
    // activeのとき、カーソルが動く
    this.active = false;
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
  hit(x, y){
    // (x, y)がcursorの画像上かどうか判定する感じ
    return this.cursor.hit(x, y, this.sliderPos);
  }
  update(){ /* 継承先により異なる */ }
  display(){
    this.cursor.display(this.sliderPos, this.active); // 円とか三角形。activeで画像指定。
  }
  setImg(nonActiveImg, activeImg){
		this.cursor.setImg(nonActiveImg, activeImg);
	}
  getValue(){ /* 継承先により異なる */ }
}

// 縦のスライダー（ただし落ちない）
class VerticalSlider extends Slider{
  constructor(key, minValue, maxValue, cursor, posX, top, down, offSetY = 0){
    super(key, minValue, maxValue, cursor);
    // 位置関係
    this.posX = posX;
    this.top = top; // 上
    this.down = down; // 下
    this.sliderPos = createVector(posX, top);
    this.offSetY = offSetY; // 設置位置によってはmouseYを直接使えないことがあるので・・
  }
  update(){
    if(this.active){
      // 縦スライダー
      this.sliderPos.set(this.posX, constrain(mouseY + this.offSetY, this.top, this.down));
    }
  }
	display(){
		// 縦線。長方形でいいよね。
		fill(255);
		rect(this.posX - 2, this.top - 2, 4, this.down - this.top + 4);
		super.display();
	}
  setPosY(y){
    this.sliderPos.y = y;
  }
  getValue(){
    // 縦スライダー
    return map(this.sliderPos.y, this.top, this.down, this.minValue, this.maxValue);
  }
}

// 横のスライダー、今回使うのはこっち（変化球ではない）
class HorizontalSlider extends Slider{
  constructor(key, minValue, maxValue, cursor, posY, left, right, offSetX = 0){
    super(key, minValue, maxValue, cursor);
    // 位置関係
    this.posY = posY;
    this.left = left; // 左
    this.right = right; // 右
    this.sliderPos = createVector(left, posY);
    this.offSetX = offSetX; // 設置位置によってはmouseXを直接・・以下略。
  }
  update(){
    if(this.active){
      // 横スライダー
      this.sliderPos.set(constrain(mouseX + this.offSetX, this.left, this.right), this.posY);
    }
  }
	display(){
		// 横線。長方形でいいよね。
		fill(255);
		rect(this.left - 2, this.posY - 2, this.right - this.left + 4, 4);
		super.display();
	}
  setPosX(x){
    this.sliderPos.x = x;
  }
  getValue(){
    // 横スライダー
    return map(this.sliderPos.x, this.left, this.right, this.minValue, this.maxValue);
  }
}

// 円形スライダー（？）
class ArcSlider extends Slider{}
class CircleSlider extends Slider{}

// カーソル
// 円、四角、三角。
// activeとinActiveの画像を渡して共通の処理とするんだけど後でいいや。
class Cursor{
  constructor(){
		this.cursorColor = {}; // デフォルト時のカーソルカラー
    this.cursorImg = {};
		this.useOriginalImg = false; // オリジナル画像を使わない場合はデフォルト。
  }
  hit(x, y, pivotVector){ return false; }
  display(pivotVector, isActive){}
	setColor(nonActiveColor, activeColor){
		this.cursorColor.nonActiveColor = nonActiveColor;
		this.cursorColor.activeColor = activeColor;
	}
  setImg(nonActiveImg, activeImg){
    this.useOriginalImg = true;
		this.cursorImg.nonActiveImg = nonActiveImg;
		this.cursorImg.activeImg = activeImg;
	}

}

class CircleCursor extends Cursor{
  constructor(cursorRadius){
    super();
    this.cursorRadius = cursorRadius;
    this.offSetX = -cursorRadius;
    this.offSetY = -cursorRadius;
  }
  hit(x, y, pivotVector){
    return dist(x, y, pivotVector.x, pivotVector.y) < this.cursorRadius;
  }
  display(pivotVector, isActive){
		if(this.useOriginalImg){
      // 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
      // デフォルト
      if(isActive){ fill(this.cursorColor.activeColor); }else{ fill(this.cursorColor.nonActiveColor); }
      ellipse(pivotVector.x, pivotVector.y, this.cursorRadius * 2, this.cursorRadius * 2);
		}
  }
}

// 横幅と縦幅
class RectCursor extends Cursor{
  constructor(cursorHalfWidth, cursorHalfHeight){
    super();
    this.cursorHalfWidth = cursorHalfWidth;
    this.cursorHalfHeight = cursorHalfHeight;
    this.offSetX = -cursorHalfWidth;
    this.offSetY = -cursorHalfHeight;
  }
  hit(x, y, pivotVector){
    return abs(x - pivotVector.x) < this.cursorHalfWidth && abs(y - pivotVector.y) < this.cursorHalfHeight;
  }
  display(pivotVector, isActive){
		if(this.useOriginalImg){
			// 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
			// デフォルト
      if(isActive){ fill(this.cursorColor.activeColor); }else{ fill(this.cursorColor.nonActiveColor); }
      rect(pivotVector.x + this.offSetX, pivotVector.y + this.offSetY, this.cursorHalfWidth * 2, this.cursorHalfHeight * 2);
		}
  }
}

// 位置を示すベクトル2つ、といっても基本的には上下左右4パターンだけど。頂点がpivotに相当する。
// hitがめんどくさい。
// offSetはたとえばxならv1.x, v2.x, 0のうち小さい方。yも同様。これは画像貼り付けに使うデータで、
// デフォルト三角形ならベクトル使うだけだから楽チン。
class TriangleCursor extends Cursor{
  constructor(v1, v2){
    super();
    this.cursorV1 = v1;
    this.cursorV2 = v2;
    this.offSetX = Math.min(0, v1.x, v2.x);
    this.offSetY = Math.min(0, v1.y, v2.y);
    // 計算に使う値（vertex1, vertex2が一次独立だから）|v1|^2 * |v2|^2 - (v1・v2)^2 > 0.
    let n1 = v1.magSq();
    let n2 = v2.magSq();
    let innerProd = p5.Vector.dot(v1, v2);
    this.dValue = n1 * n2 - innerProd * innerProd; // 正の数。
    // まず|v2|^2 * v1と|v1|^2 * v2, さらに(v1・v2) * v2と(v1・v2) * v1を計算する。
    let v3 = p5.Vector.mult(v1, n2);
    let v4 = p5.Vector.mult(v2, n1);
    let v5 = p5.Vector.mult(v2, innerProd);
    let v6 = p5.Vector.mult(v1, innerProd);
    // はじめのは|v2|^2 * v1 - (v1・v2) * v2. check1・v > 0が条件1.
    this.checkVector1 = p5.Vector.sub(v3, v5);
    // 次のやつは|v1|^2 * v2 - (v1・v2) * v1. check2・v > 0が条件2.
    this.checkVector2 = p5.Vector.sub(v4, v6);
    // さいごにこの二つを足してcheck3とする。 check3・v < D が条件3.
    this.checkVector3 = p5.Vector.add(this.checkVector1, this.checkVector2);
  }
  hit(x, y, pivotVector){
    let check1 = (x - pivotVector.x) * this.checkVector1.x + (y - pivotVector.y) * this.checkVector1.y;
    let check2 = (x - pivotVector.x) * this.checkVector2.x + (y - pivotVector.y) * this.checkVector2.y;
    let check3 = (x - pivotVector.x) * this.checkVector3.x + (y - pivotVector.y) * this.checkVector3.y;
    return check1 > 0 && check2 > 0 && check3 < this.dValue;
  }
  display(pivotVector, isActive){
		if(this.useOriginalImg){
			// 画像貼り付けの場合
      let x = pivotVector.x + this.offSetX;
      let y = pivotVector.y + this.offSetY;
      let imgPath = (isActive ? "activeImg" : "nonActiveImg");
      image(this.cursorImg[imgPath], x, y);
		}else{
			// デフォルト
      if(isActive){ fill(this.cursorColor.activeColor); }else{ fill(this.cursorColor.nonActiveColor); }
      let x1 = pivotVector.x + this.cursorV1.x;
      let y1 = pivotVector.y + this.cursorV1.y;
      let x2 = pivotVector.x + this.cursorV2.x;
      let y2 = pivotVector.y + this.cursorV2.y;
      triangle(pivotVector.x, pivotVector.y, x1, y1, x2, y2);
		}
  }
}

// ---------------------------------------------------------------------------------------- //
// SliderSet.
// activateでマウス位置に応じて場合によってはいずれかのスライダーがactivateされて、
// マウスを動かすとスライダーが動いて値が変化する。
// マウスを離すとinActivateされて色々解除。
// さらにキー登録機能により、キーを元に値を取得することが出来て、
// 動かしたい変数をバインドさせることで特定のプロパティと連動して変化させることができる。

// キー値から直接値を取得したい（たとえば"red"がキーならthis.redで値が出るみたいな）

class SliderSet{
	constructor(){
		this.sliderArray = new CrossReferenceArray();
		this.sliderDict = {};
		this.activeSliderKey = "";
    this.active = false; // activeなスライダーがあるかどうか
	}
	regist(slider){
    // 登録時にキーから接続できるようにして・・さらにキーから値を取得できるようにパスを作る
		this.sliderArray.add(slider);
    this.sliderDict[slider.key] = slider;
    this[slider.key] = slider.getValue();
	}
  registMulti(sliderArray){
    // 複数版
    sliderArray.forEach((slider) => { this.regist(slider); })
  }
	getValueByIndex(index){
		return this.sliderArray[index].getValue();
	}
	update(){
		this.sliderArray.every("update");
		// アクティブな場合のみ値変更
		if(this.active){ this[this.activeSliderKey] = this.sliderDict[this.activeSliderKey].getValue(); }
	}
	display(){
		this.sliderArray.every("display");
	}
	activate(offSetX = 0, offSetY = 0){
		// マウス位置がヒットしたらactivate. ひとつまで。
		this.sliderArray.forEach((eachSlider) => {
			if(eachSlider.hit(mouseX + offSetX, mouseY + offSetY)){
				eachSlider.activate();
        this.active = true;
				this.activeSliderKey = eachSlider.key; // activeなスライダーのキーをセット（これの為にキーを登録した）
				return;
			}
		})
	}
	inActivate(){
		this.sliderArray.every("inActivate");
		this.activeSliderKey = "";
    this.active = false;
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
  addMulti(elementArray){
    // 複数の場合
    elementArray.forEach((element) => { this.add(element); })
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
