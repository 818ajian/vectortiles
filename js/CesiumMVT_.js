function createMVTWithStyle(cesium, ol, createMapboxStreetsV6Style, options) {
	console.log(cesium, ol, createMapboxStreetsV6Style, options)
	function init(options) {
		//使用webmercator投影
		this._tilingScheme = cesium.defined(options.tilingScheme) ? options.tilingScheme : new cesium.WebMercatorTilingScheme()

		this._tileWidth = cesium.defaultValue(options.tileWidth, 512)
		this._tileHeight = cesium.defaultValue(options.tileHeight, 512)

		this._readyPromise = cesium.when.resolve(!0)

		//嵌入ol加载矢量切片的方法
		this._ol = ol
		this._mvtParser = new this._ol.format.MVT

		//引入style
		this._styleFun = createMapboxStreetsV6Style

		//地图路径和在线key
		this._key = cesium.defaultValue(options.key, "")
		this._url = cesium.defaultValue(options.url, "");

		//切片范围
		var z = this._tilingScheme._rectangleSouthwestInMeters
		var l = this._tilingScheme._rectangleNortheastInMeters
		var extent = [z.x, z.y, l.x, l.y];

		//切片的一些配置
		this._resolutions = ol.tilegrid.resolutionsFromExtent(extent, 22, this._tileWidth)
		this._pixelRatio = 1
		this._transform = [.125, 0, 0, .125, 0, 0]
		this._replays = ["Default", "Image", "Polygon", "LineString", "Text"]
		this._tileQueue = new cesium.TileReplacementQueue
		this._cacheSize = 1e3
	}

	return cesium.defineProperties(init.prototype, {
		proxy: {
			get: function () { }
		},
		tileWidth: {
			get: function () {
				return this._tileWidth
			}
		},
		tileHeight: {
			get: function () {
				return this._tileHeight
			}
		},
		maximumLevel: {
			get: function () { }
		},
		minimumLevel: {
			get: function () { }
		},
		tilingScheme: {
			get: function () {
				return this._tilingScheme
			}
		},
		rectangle: {
			get: function () {
				return this._tilingScheme.rectangle
			}
		},
		tileDiscardPolicy: {
			get: function () { }
		},
		errorEvent: {
			get: function () {
				return this._errorEvent
			}
		},
		ready: {
			get: function () {
				return !0
			}
		},
		readyPromise: {
			get: function () {
				return this._readyPromise
			}
		},
		credit: {
			get: function () { }
		},
		hasAlphaChannel: {
			get: function () {
				return !0
			}
		}
	}),
	//获取xyz
		init.prototype.requestImage = function (x, y, z) {
			// console.log(x,y,z)
			var update_canvas = function (x, y, z, tilequeue) {
				for (var canvas = tilequeue.head; canvas && (canvas.xMvt != x || canvas.yMvt != y || canvas.zMvt != z);) canvas = canvas.replacementNext;
				return canvas
			}(x, y, z, this._tileQueue);
			console.log()
			if (update_canvas) return update_canvas;
			var that = this
			var url = this._url;
			//存在key与不存在key的url拼接方法
			url = this._key ? url.replace("{x}", x).replace("{y}", y).replace("{z}", z).replace("{k}", this._key) : url.replace("{x}", x).replace("{y}", y).replace("{z}", z);

			//初始化绘制区域
			(function (x, y, z) {
				cesium.Resource.createIfNeeded(url).fetchArrayBuffer().then(function (arraybuffer) {
					// console.log(arraybuffer)
					//绘制区域
					var canvas = document.createElement("canvas");
					canvas.width = 512, canvas.height = 512;
					var ctx = canvas.getContext("2d")

					//转为features
					var features = that._mvtParser.readFeatures(arraybuffer)
					// console.log(features)

					//styles
					var styles = that._styleFun()
					// console.log(styles) 

					//
					var render = new ol.render.canvas.ReplayGroup(0, [0, 0, 4096, 4096], 8, true, 100)
					// console.log(render)

					for ( var i = 0; i < features.length; i++) {
						var single_feature = features[i];
						// console.log(single_feature)
						// console.log(styles(features[i], that._resolutions[z]))

						var styletypes = styles(features[i], that._resolutions[z])
						for (p = 0; p < styletypes.length; p++) ol.renderer.vector.renderFeature_(render, single_feature, styletypes[p],
							16)
					}
					return render.finish(), render.replay(ctx, that._pixelRatio, that._transform, 0, {}, that._replays, !0), that._tileQueue.count > that._cacheSize &&
						function (ol, x) {
							for (var y = ol.tail; ol.count > x && cesium.defined(y);) {
								var z = y.replacementPrevious;
								delete y, y = null, y = z
							}
						}(that._tileQueue, that._cacheSize / 2), canvas.xMvt = x, canvas.yMvt = y, canvas.zMvt = z, that._tileQueue.markTileRendered(canvas),
						delete render, render = null, canvas
				})
			})(x, y, z)

		},

		new init(options)
}
