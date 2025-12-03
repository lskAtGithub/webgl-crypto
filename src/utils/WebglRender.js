export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initShader();
    this.initBuffer();

    this.bgTexture = null;
    this.bgWidth = 1920;
    this.bgHeight = 1080;

    this.sprites = [];

    this.cameraX = 0;
    this.targetCameraX = 0;

    this.mouseX = 0.5;
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX / window.innerWidth;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // ✅ 如果背景还没加载，不计算 scale，直接退出
    if (!this.bgWidth || !this.bgHeight) return;

    // ✅ 等比 cover 缩放
    this.scale = Math.max(this.canvas.width / this.bgWidth, this.canvas.height / this.bgHeight);

    this.viewWorldWidth = this.canvas.width / this.scale;
    this.viewWorldHeight = this.canvas.height / this.scale;
  }

  initShader() {
    const gl = this.gl;

    const vs = `
      attribute vec2 a_pos;
      attribute vec2 a_uv;
      varying vec2 v_uv;
      void main(){
        v_uv = a_uv;
        gl_Position = vec4(a_pos,0.0,1.0);
      }
    `;

    const fs = `
      precision mediump float;
      uniform sampler2D u_tex;
      varying vec2 v_uv;
      void main(){
        gl_FragColor = texture2D(u_tex, v_uv);
      }
    `;

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vs);
    gl.compileShader(vShader);

    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fs);
    gl.compileShader(fShader);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);

    this.aPos = gl.getAttribLocation(this.program, 'a_pos');
    this.aUV = gl.getAttribLocation(this.program, 'a_uv');
    this.uTex = gl.getUniformLocation(this.program, 'u_tex');
  }

  initBuffer() {
    this.buffer = this.gl.createBuffer();
  }

  createTexture(img) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return tex;
  }

  setBackground(img) {
    this.bgTexture = this.createTexture(img);
    this.bgWidth = img.width;
    this.bgHeight = img.height;

    // ✅ 关键：背景准备好后，强制重新计算 resize
    this.resize();
  }

  addSprite(sprite) {
    sprite.texture = this.createTexture(sprite.image);
    this.sprites.push(sprite);
  }

  update() {
    const maxMove = Math.max(0, this.bgWidth - this.viewWorldWidth);

    this.targetCameraX = this.mouseX * maxMove;
    this.cameraX += (this.targetCameraX - this.cameraX) * 0.08;
  }

  worldToNDC(x, y, w, h) {
    const vw = this.viewWorldWidth;
    const vh = this.viewWorldHeight;

    const sx = (x - this.cameraX) / vw;
    const sy = y / vh;
    const sw = w / vw;
    const sh = h / vh;

    const x1 = sx * 2 - 1;
    const y1 = 1 - sy * 2;
    const x2 = (sx + sw) * 2 - 1;
    const y2 = 1 - (sy + sh) * 2;

    return [x1, y1, 0, 0, x2, y1, 1, 0, x1, y2, 0, 1, x2, y2, 1, 1];
  }

  render() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.bgTexture) {
      this.drawWorldQuad(this.bgTexture, 0, 0, this.bgWidth, this.bgHeight);
    }

    for (const s of this.sprites) {
      this.drawWorldQuad(s.texture, s.worldX, s.worldY, s.worldW, s.worldH);
    }
  }

  drawWorldQuad(texture, x, y, w, h) {
    const gl = this.gl;
    const data = this.worldToNDC(x, y, w, h);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.aPos);

    gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, 16, 8);
    gl.enableVertexAttribArray(this.aUV);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uTex, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
