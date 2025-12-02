export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    this.mouseX = 0.5; // 实时鼠标
    this.targetOffset = 0.5; // 目标值
    this.currentOffset = 0.5; // 阻尼后的真实值
    this.textureLoaded = false;
    this.ease = 0.08; // ⭐惯性强度（0.05 慢，0.15 快）

    this.initGL();
    this.initEvents();
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }

  // ================= 初始化 =================
  initGL() {
    const gl = this.gl;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec2 v_texCoord;

      uniform sampler2D u_image;
      uniform float u_offset;
      uniform float u_aspectImage;
      uniform float u_aspectScreen;

      void main() {
        vec2 uv = v_texCoord;

        // 等比裁剪铺满
        if (u_aspectScreen > u_aspectImage) {
          float scale = u_aspectScreen / u_aspectImage;
          uv.y = 0.5 + (uv.y - 0.5) / scale;
        } else {
          float scale = u_aspectImage / u_aspectScreen;
          uv.x = 0.5 + (uv.x - 0.5) / scale;
        }

        // 2.5D 视差偏移
        uv.x += (u_offset - 0.5) * 0.18;
        gl_FragColor = texture2D(u_image, uv);
      }
    `;

    const vertexShader = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fsSource);

    this.program = this.createProgram(vertexShader, fragmentShader);
    gl.useProgram(this.program);

    // 顶点 + UV
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const vertices = new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]);

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const a_position = gl.getAttribLocation(this.program, 'a_position');
    const a_texCoord = gl.getAttribLocation(this.program, 'a_texCoord');

    gl.enableVertexAttribArray(a_position);
    gl.enableVertexAttribArray(a_texCoord);

    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 16, 8);

    // uniforms
    this.uOffset = gl.getUniformLocation(this.program, 'u_offset');
    this.uAspectImage = gl.getUniformLocation(this.program, 'u_aspectImage');
    this.uAspectScreen = gl.getUniformLocation(this.program, 'u_aspectScreen');
  }

  // ================= 加载纹理 =================
  setTexture(image) {
    const gl = this.gl;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1f(this.uAspectImage, image.width / image.height);
    this.textureLoaded = true;
  }

  // ================= 更新参数 =================
  update() {
    if (!this.textureLoaded) return;
    // 核心：阻尼跟随（惯性）
    this.currentOffset += (this.targetOffset - this.currentOffset) * this.ease;
    const gl = this.gl;
    gl.uniform1f(this.uOffset, this.currentOffset);
    gl.uniform1f(this.uAspectScreen, this.canvas.width / this.canvas.height);
  }

  // ================= 真正绘制 =================
  render() {
    if (!this.textureLoaded) return;

    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ================= 事件 =================
  initEvents() {
    window.addEventListener('mousemove', (e) => {
      this.targetOffset = e.clientX / window.innerWidth;
    });
  }

  // ================= resize =================
  resize() {
    const canvas = this.canvas;
    const gl = this.gl;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.style.width = vw + 'px'; // 或 '100vw'
    canvas.style.height = vh + 'px'; // 或 '100vh'
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(vw * dpr));
    canvas.height = Math.max(1, Math.floor(vh * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // ================= 工具函数 =================
  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  createProgram(vs, fs) {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
  }
}
