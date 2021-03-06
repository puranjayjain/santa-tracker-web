/*
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

goog.provide('app.FrameWrapper');

goog.require('app.Constants');
goog.require('app.Scoreboard');
goog.require('app.shared.FrameRPC');
goog.require('app.shared.Gameover');

/**
 * IFrame proxy class.
 * Handles all the postMessage communication.
 * @param {!Element} el DOM element containing the scene.
 * @param {string} staticDir where the scene's frame can be found.
 * @constructor
 * @export
 */
app.FrameWrapper = function(el, staticDir) {
  this.staticDir = staticDir;
  this.el = $(el);
  this.gameoverView = new app.shared.Gameover(this, this.el.find('.gameover'));
  this.scoreboardView = new app.Scoreboard(this.el.find('.board'), app.Constants.TOTAL_LEVELS);
  this.gameStartTime = +new Date;
  this.iframeEl = this.el.find('iframe[data-computer-love]');
  this.isPlaying = false;

  // Create a communication channel to the game frame.
  this.iframeChannel = new app.shared.FrameRPC(this.iframeEl[0].contentWindow, {
    gameover: this.gameover.bind(this),
    iframeFocusChange: this.iframeFocusChange.bind(this),
    setLevel: this.setLevel.bind(this),
    triggerSound: this.triggerSound.bind(this)
  });

  // internal level number for analytics
  this.level_ = 1;

  // Load the iframe.
  this.setIframeSrc();

  // Too soon for postMessage.
  this.restart();
};

/**
 * Restarts the game
 */
app.FrameWrapper.prototype.restart = function() {
  this.isPlaying = true;
  window.santaApp.fire('sound-ambient', 'music_start_scene');
  this.iframeChannel.call('restart');
  window.santaApp.fire('analytics-track-game-start', {gameid: 'codelab'});
};

/**
 * dds extra levels and restarts the game at the first extra level.
 */
app.FrameWrapper.prototype.playExtra = function() {
  this.isPlaying = true;
  window.santaApp.fire('sound-ambient', 'music_start_scene');
  this.iframeChannel.call('playExtra');
  window.santaApp.fire('analytics-track-game-start', {gameid: 'codelab'});
};

/**
 * Destructor.
 */
app.FrameWrapper.prototype.dispose = function() {
  if (this.isPlaying) {
    window.santaApp.fire('analytics-track-game-quit', {gameid: 'codelab',
        timePlayed: new Date - this.gameStartTime,
        level: this.level_});
  }

  this.iframeChannel.dispose();
  this.iframeEl = null;
};

/**
 * Loads the gameplay frame into the iframe.
 */
app.FrameWrapper.prototype.setIframeSrc = function() {
  var filename = window.DEV_SCENE ? 'index.html' : 'codelabframe-scene_' + document.documentElement.lang + '.html';
  this.iframeEl.attr('src', this.staticDir + '../codelabframe/' + filename + location.search);
};

app.FrameWrapper.prototype.triggerSound = function(event) {
  window.santaApp.fire('sound-trigger', {name: event, args: []})
};

/**
 * Triggers the shared game over view.
 * @param {boolean=} playExtra Whether to show play extra option.
 */
app.FrameWrapper.prototype.gameover = function(playExtra) {
  this.isPlaying = false;

  this.gameoverView.show(0, 10, playExtra);

  window.santaApp.fire('analytics-track-game-over', {
    gameid: 'codelab',
    score: 0,
    level: 10,
    timePlayed: new Date - this.gameStartTime
  });
};

/**
 * Takes any iframe focus state changes and passes them on to santaApp.
 * @param {string} state Focus state. Either 'focus' or 'blur'.
 */
app.FrameWrapper.prototype.iframeFocusChange = function(state) {
  if (state === 'focus' || state === 'blur') {
    window.santaApp.fire('iframe-focus-change', state);
  }
};

/**
 * Updates the level in the scoreboard.
 * @param {number} level which level is it.
 */
app.FrameWrapper.prototype.setLevel = function(level) {
  this.level_ = level;
  this.scoreboardView.setLevel(level);
};
