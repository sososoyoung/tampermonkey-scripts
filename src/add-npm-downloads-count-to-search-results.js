// ==UserScript==
// @name         Add downloads count for npm search results
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Add downloads count for npm search results
// @author       sososoyoung
// @connect      api.npmjs.org
// @include      *://www.npmjs.com/
// @include      *://www.npmjs.com/search*
// @require      https://cdn.staticfile.org/jquery/3.4.1/jquery.min.js
// @grant        GM.xmlHttpRequest
// @grant        GM.log
// @license      MIT
// ==/UserScript==
//@match        http://www.npmjs.com

(function () {
  "use strict";

  let href = "";
  let packageName = "";
  let checkWorkId = Date.now();
  const selectors = {
    des: ".w-80 .black-80 .black-50",
  };

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
          Accept: "application/json", // If not specified, browser defaults will be used.
        },
        url:
          "https://api.npmjs.org/downloads/point/last-week/" +
          encodeURIComponent(name),
        onload: function (res) {
          r(JSON.parse(res.responseText).downloads);
        },
        onerror: j,
      });
    });
  }

  function getPkgName(section) {
    const name = $(section).find(".w-80 .items-end h3").text();
    return name;
  }

  function setCount(section, count) {
    const desDom = $(section).find(selectors.des);
    desDom.html(desDom.html() + " • Weekly Downloads: " + count);
  }

  function checkHadCount(section) {
    const desDom = $(section).find(selectors.des);
    return /Weekly Downloads/.test(desDom.html());
  }

  const splitCount = [1000 * 1000, 1000];
  async function addDownloadCount(section) {
    const name = getPkgName(section);
    let count = await getDownloadCountByName(name);
    if (count > splitCount[0] * 10) {
      // > 10M
      count = (count / splitCount[0]).toFixed(2) + "M";
    } else if (count > splitCount[1] * 10) {
      // > 10K
      count = (count / splitCount[1]).toFixed(2) + "K";
    }
    setCount(section, count);
  }

  async function updateCounts(id) {
    try {
      const s = Date.now();
      href = window.location.href;
      const sections = getSections();
      if (
        sections &&
        sections.length > 0 &&
        window.location.pathname === "/search"
      ) {
        GM.log("[d-count] updateCounts...");
        for (let i = 0; i < sections.length; i++) {
          if (id === checkWorkId && !checkHadCount(sections[i])) {
            if (i % 5 === 0) {
              await addDownloadCount(sections[i]);
            } else {
              addDownloadCount(sections[i]);
            }
          } else {
            GM.log("[d-count] continue.");
            continue;
          }
        }
      } else {
        GM.log("[d-count] PASS.");
      }
      GM.log(
        "[d-count] done. Take: " + Math.floor((Date.now() - s) / 1000) + "s."
      );
    } catch (e) {
      console.error("updateCounts error:", e);
    }
  }

  function parseSearch(search = "") {
    return search
      .split("&")
      .map((i = "") => i.split("="))
      .reduce((o, i) => {
        if (i.length === 2 && i[0]) {
          o[i[0]] = i[1];
        }
        return o;
      }, {});
  }

  function checkUrl() {
    if (href !== window.location.href && window.location.search) {
      const newQ = parseSearch(window.location.search.substr(1)).q;
      GM.log("[d-count] url had changed!", newQ, packageName);
      packageName = newQ;
      checkWorkId = Date.now();
      updateCounts(checkWorkId);
    }
  }

  function checkUrlChange() {
    setInterval(checkUrl, 500);
  }

  // start
  updateCounts(checkWorkId);
  checkUrlChange();
})();
