// ==UserScript==
// @name         Add downloads count for npm search results
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Add downloads count for npm search results
// @author       sososoyoung
// @connect      api.npmjs.org
// @include      *://www.npmjs.com/
// @include      *://www.npmjs.com/search*
// @require      https://cdn.staticfile.org/jquery/3.4.1/jquery.min.js
// @grant        GM.xmlHttpRequest
// @license      MIT
// ==/UserScript==

//@match        http://www.npmjs.com
(function() {
  "use strict";

  let href = "";
  let checkWorkId = Date.now();

  function getSections() {
    const sections = $("section");
    return sections;
  }

  function getDownloadCountByName(name = "") {
    if (!name) {
      return 0;
    }

    return new Promise((r, j) => {
      GM.xmlHttpRequest({
        method: "GET",
        headers: {
          Accept: "application/json" // If not specified, browser defaults will be used.
        },
        url:
          "https://api.npmjs.org/downloads/point/last-week/" +
          encodeURIComponent(name),
        onload: function(res) {
          r(JSON.parse(res.responseText).downloads);
        },
        onerror: j
      });
    });
  }

  function getPkgName(section) {
    const name = $(section)
      .find(".w-80 .items-end h3")
      .text();
    return name;
  }

  function setCount(section, count) {
    const desDom = $(section).find(".w-80 .black-80 .black-50");
    desDom.html(desDom.html() + " • Weekly Downloads: " + count);
  }

  const splitCount = [1000 * 1000 * 10, 1000 * 10];
  async function addDownloadCount(section) {
    const name = getPkgName(section);
    let count = await getDownloadCountByName(name);
    if (count > splitCount[0]) {
      // > 10M
      count = (count / splitCount[0]).toFixed(2) + "M";
    } else if (count > splitCount[1]) {
      // > 10K
      count = (count / splitCount[1]).toFixed(2) + "K";
    }
    setCount(section, count);
  }

  async function start(id) {
    try {
      const s = Date.now();
      href = window.location.href;
      const sections = getSections();
      if (
        sections &&
        sections.length > 0 &&
        window.location.pathname === "/search"
      ) {
        console.log("[d-count] start...");
        for (let i = 0; i < sections.length; i++) {
          if (id === checkWorkId) {
            await addDownloadCount(sections[i]);
          } else {
            console.log("[d-count] continue.");
            continue;
          }
        }
      } else {
        console.log("[d-count] PASS.");
      }
      console.log(
        "[d-count] done. Take: " + Math.floor((Date.now() - s) / 1000) + "s."
      );
    } catch (error) {
      console.error("start error:", e);
    }
  }

  function checkUrl() {
    if (href !== window.location.href) {
      console.log("[d-count] url had changed!!!");
      checkWorkId = Date.now();
      start(checkWorkId);
    }
  }
  function checkUrlChange() {
    setInterval(checkUrl, 500);
  }

  // start
  start(checkWorkId);
  checkUrlChange();
})();
