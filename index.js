const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

module.exports = {
  defaultConfig: {
    enabled: false
  },
  pluginName: 'SiegeInsightsPlugin',
  pluginDescription: 'Exports siege matchup info and attack logs for Siege Insights (siege.sw-insights.com)',
  data: {},
  logged_data: { matchup_info: 0, attack_log: 0, defense_log: 0, defense_list: 0 },
  match_id: undefined,
  init(proxy, config) {
    proxy.on('GetGuildSiegeMatchupInfo', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.data['wizard_id'] = req.wizard_id;
        this.data['matchup_info'] = resp;
        this.logged_data.matchup_info = 1;
        this.match_id = resp.match_info.match_id;
        this.writeSiegeMatchToFile(proxy, this.data, 'matchup info');
      }
    });
    proxy.on('GetGuildSiegeBattleLog', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        let log_msg;
        if (req.log_type === 1) {
          this.data['attack_log'] = resp;
          this.logged_data.attack_log = 1;
          log_msg = 'attack log';
        } else {
          this.data['defense_log'] = resp;
          this.logged_data.defense_log = 1;
          log_msg = 'defense log';
        }
        this.match_id = resp.log_list[0].guild_info_list[0].match_id;
        this.writeSiegeMatchToFile(proxy, this.data, log_msg);
      }
    });
    proxy.on('GetGuildSiegeBaseDefenseUnitList', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        if (req.base_number === 1) {
          this.data['defense_list'] = resp;
          this.logged_data.defense_list = 1;
          this.writeSiegeMatchToFile(proxy, this.data, 'defenses list');
        }
      }
    });
  },
  writeSiegeMatchToFile(proxy, data, log_msg) {
    const filename = sanitize(this.match_id ? `SiegeMatch-${this.match_id}` : 'SiegeDefenseList').concat('.json');

    const outFile = fs.createWriteStream(path.join(config.Config.App.filesPath, filename), {
      flags: 'w',
      autoClose: true
    });

    outFile.write(JSON.stringify(data, true, 2));
    outFile.end();
    const message = `<div>
                      Saved ${log_msg} data to file ${filename}.

                      <ul>
                        <li>Active Matchup: ${this.logged_data.matchup_info ? 'v' : 'x'}</li>
                        <li>Attack Log: ${this.logged_data.attack_log ? 'v' : 'x'}</li>
                        <li>Defense Log: ${this.logged_data.defense_log ? 'v' : 'x'}</li>
                        <li>Defense List: ${this.logged_data.defense_list ? 'v' : 'x'}</li>
                      </ul>
                     </div>`;
    proxy.log({ type: 'success', source: 'plugin', name: this.pluginName, message: message });
  }
};
