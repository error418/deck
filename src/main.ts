import container from "./ioc-config";
import PageRoutes from "./pages/page-routes";
import { WebServer } from "./webserver";
import { HistoryService, ElasticHistoryService, NoopHistoryService } from "./history/history-service";
import { ConfigurationService, DeckConfig } from "./configuration";
import { log } from "@swingletree-oss/harness";
import { Authenticator } from "./auth/auth";


process.on("unhandledRejection", error => {
  log.error("Unhandled Promise rejection: %j", error);
});

class Deck {
  private webserver: WebServer;
  private pageRoutes: PageRoutes;
  private authenticator: Authenticator;

  constructor() {

    const configService = container.get<ConfigurationService>(ConfigurationService);
    if (configService.getBoolean(DeckConfig.ELASTIC_ENABLED)) {
      log.info("Registering Elastic Storage Service");
      container.bind<HistoryService>(HistoryService).to(ElasticHistoryService).inSingletonScope();
    } else {
      log.info("Elastic is disabled. Will not read any Notification Events from Elastic.");
      container.bind<HistoryService>(HistoryService).to(NoopHistoryService).inSingletonScope();
    }
    container.get<HistoryService>(HistoryService);

    this.webserver = container.get<WebServer>(WebServer);
    this.pageRoutes = container.get<PageRoutes>(PageRoutes);

    if (configService.getBoolean(DeckConfig.FEATURES_LOGIN)) {
      log.info("initialize authenticator");
      this.authenticator = container.get<Authenticator>(Authenticator);
    }
  }

  public run() {
    this.webserver.addRouter("/", this.pageRoutes.getRoute());

    if (this.authenticator) {
      log.info("register authentication endpoints");
      this.webserver.addRouter("/auth", this.authenticator.getRouter());
    }
  }

}

new Deck().run();
