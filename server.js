/* main server.js patché pour Render:
   - force écoute sur process.env.PORT || config.server_port
   - filtre les logs "Detected a new open port HTTP:..."
   - toobusy.onLag ne kill plus le process
*/

(async function () {
  // ---- début hack: filtrer certains logs (pour éviter le spam "Detected a new open port") ----
  const _origConsoleLog = console.log;
  console.log = function (...args) {
    try {
      const s = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      if (/Detected a new open port HTTP:\d+/.test(s)) {
        // ignore this specific spammy message
        return;
      }
    } catch (e) {
      // noop
    }
    _origConsoleLog.apply(console, args);
  };
  // ---- fin hack de filtrage de log ----

  const {
    fetcher,
    core,
    wiki,
    musicInfo,
    modules,
    version,
    initlog,
    init,
  } = require("./src/libpoketube/libpoketube-initsys.js");
  const media_proxy = require("./src/libpoketube/libpoketube-video.js");
  const { sinit } = require("./src/libpoketube/init/superinit.js");
  const innertube = require("./src/libpoketube/libpoketube-youtubei-objects.json");
  const fs = require("fs");
  const config = require("./config.json");
  const u = await media_proxy();

  fs.readFile("ascii_txt.txt", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
      return;
    }
    console.log(data);
  });

  initlog("Loading...");
  initlog(
    "[Welcome] Welcome To Poke - The ultimate privacy app - :3 " +
      "Running " +
      `Node ${process.version} - V8 v${
        process.versions.v8
      } -  ${process.platform.replace("linux", "GNU/Linux")} ${
        process.arch
      } Server - libpt ${version}`
  );

  const {
    IsJsonString,
    convert,
    getFirstLine,
    capitalizeFirstLetter,
    turntomins,
    getRandomInt,
    getRandomArbitrary,
  } = require("./src/libpoketube/ptutils/libpt-coreutils.js");
  const { ieBlockMiddleware } = require("./src/libpoketube/ptutils/ie-blocker.js");
  initlog("Loaded libpt-coreutils");

  const templateDir = modules.path.resolve(
    `${process.cwd()}${modules.path.sep}html`
  );

  const sha384 = modules.hash;
  const rateLimit = require("express-rate-limit");

  const limiter = rateLimit({
    windowMs: 30 * 1000, // 30 second window
    max: 200, // limit each IP to 200 requests per 30 seconds
  });

  var app = modules.express();

  // trust proxy pour Render / Docker (déjà présent)
  app.set("trust proxy", 1);

  app.use(limiter);
  app.use(ieBlockMiddleware);
  initlog("Loaded express.js");
  app.engine("html", require("ejs").renderFile);
  app.use(modules.express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  app.use(modules.useragent.express());
  app.use(modules.express.json()); // for parsing application/json

  var toobusy = require("toobusy-js");

  const renderTemplate = async (res, req, template, data = {}) => {
    res.render(
      modules.path.resolve(`${templateDir}${modules.path.sep}${template}`),
      Object.assign(data)
    );
  };

  // Set check interval to a faster value. This will catch more latency spikes
  // but may cause the check to be too sensitive.
  toobusy.interval(110);
  toobusy.maxLag(3500);

  app.use(function (req, res, next) {
    if (toobusy()) {
      res.status(503).send("I'm busy right now, sorry.");
    } else {
      next();
    }
  });

  // remplacer le comportement destructeur (process.exit) par log + metric
  toobusy.onLag(function (currentLag) {
    console.error("Event loop lag detected! Latency: " + currentLag + "ms");
    // on Render on laisse container supervisor gérer le restart si nécessaire
    // ne pas process.exit(1) pour éviter boucle de crash/restart infinie
  });

  const initPokeTube = function () {
    // Protection : s'il existe un mécanisme de scanning qui démarre depuis sinit,
    // on peut définir un flag pour le désactiver si sinit le lit.
    process.env.POKETUBE_DISABLE_PORT_SCAN = "1";
    sinit(app, config, renderTemplate);
    initlog("inited super init");
    // forcer init avec le port de Render si présent
    const PORT = process.env.PORT || config.server_port || 6003;
    init(app, PORT);
    initlog("inited app on port " + PORT);
  };

  try {
    app.use(function (req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      if (req.secure) {
        res.header(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains; preload"
        );
      }
      res.header("secure-poketube-instance", "1");

      // opt out of googles "FLOC"
      res.header("Permissions-Policy", "interest-cohort=()");
      res.header("software-name", "poke");
      next();
    });

    app.use(function (request, response, next) {
      if (config.enablealwayshttps && !request.secure) {
        if (
          !/^https:/i.test(
            request.headers["x-forwarded-proto"] || request.protocol
          )
        ) {
          return response.redirect(
            "https://" + request.headers.host + request.url
          );
        }
      }
      next();
    });

    app.use(function (req, res, next) {
      res.header(
        "X-PokeTube-Youtube-Client-Name",
        innertube.innertube.CONTEXT_CLIENT.INNERTUBE_CONTEXT_CLIENT_NAME
      );
      res.header(
        "Hey-there",
        "Do u wanna help poke? contributions are welcome :3 https://codeberg.org/Ashley/poke"
      );

      res.header(
        "X-PokeTube-Youtube-Client-Version",
        innertube.innertube.CLIENT.clientVersion
      );
      res.header(
        "X-PokeTube-Client-name",
        innertube.innertube.CLIENT.projectClientName
      );
      res.header("X-PokeTube-Speeder", "3 seconds no cache, 280ms w/cache");
      res.header("X-HOSTNAME", req.hostname);
      if (req.url.match(/^\/(css|js|img|font)\/.+/)) {
        res.setHeader(
          "Cache-Control",
          "public, max-age=" + config.cacher_max_age
        ); // cache header
        res.setHeader("poketube-cacher", "STATIC_FILES");
      }

      const a = 890;

      if (!req.url.match(/^\/(css|js|img|font)\/.+/)) {
        res.setHeader("Cache-Control", "public, max-age=" + a); // cache header
        res.setHeader("poketube-cacher", "PAGE");
      }
      next();
    });

    initlog("[OK] Load headers");
  } catch (e) {
    initlog("[FAILED] load headers");
    console.error(e);
  }

  try {
    app.get("/robots.txt", (req, res) => {
      res.sendFile(__dirname + "/robots.txt");
    });

    initlog("[OK] Load robots.txt");
  } catch (e) {
    initlog("[FAILED] load robots.txt");
    console.error(e);
  }

  initPokeTube();
})();

