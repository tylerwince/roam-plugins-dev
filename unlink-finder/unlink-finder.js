function getAllPages() {
    pageObjs = window.roamAlphaAPI.q('[:find ?e :where [?e :node/title] ]');
    var pageNames = [];
    for (i = 0; i < pageObjs.length; i++) {
        pageNames.push(window.roamAlphaAPI.pull('[:node/title]', pageObjs[i][0])[":node/title"]);
    }
    pageNames.sort(function(a, b){
        return b.length - a.length;
    });
    return pageNames;
};

function getAllAliases() {
    aliasMap = new Map();

    aliasPages = window.roamAlphaAPI
        .q(
            `[:find (pull ?parentPage [*]) 
              :where [?parentPage :block/children ?referencingBlock] 
                     [?referencingBlock :block/refs ?referencedPage] 
                     [?referencedPage :node/title "Aliases"]
             ]`
        )
        .map((p) => p[0]);

    for (i = 0; i < aliasPages.length; i++) {
        try {
            aliases = aliasPages[i].attrs[0][2].value.split(",");
            for (j = 0; j < aliases.length; j++) {
                aliasMap.set(aliases[j].trim(), aliasPages[i].title);
            };
        }
        catch (err) {
            continue;
        };
    };
    return aliasMap;
};

function pageTaggedInParent(node, page) {
    parent = node.parentElement;
    while (parent.classList.contains("roam-article") == false) {
        parent = parent.parentElement;
        if (parent.hasAttribute("data-page-links")) {
            linkedPages = JSON.parse(parent.getAttribute("data-page-links"));
            if (linkedPages.includes(page)) {
                return true;
            };
        };
    };
    return false;
};

function findTargetNodes(blocks, pages, aliases) {
    matched = false;
    loop1:
    for (i = 0; i < blocks.length; i++) {
        // all blocks only have 1 top level child node, a span.
        // skip to the second level of children
        for (j = 0; j < blocks[i].childNodes[0].childNodes.length; j++) {
            node = blocks[i].childNodes[0].childNodes[j];
            if (node.nodeType == 3) { // only text, no more childrens
                if (spanWrapper(node, pages, aliases) == true) {
                    matched = true;
                    continue loop1;
                };
                continue;
            };
            if (node.nodeType == 1) { // element node type, need to dig deeper
                // these are already linked, skip
                if (node.hasAttribute("data-link-title")
                    || node.hasAttribute("data-tag")
                    || node.hasAttribute("recommend")) {
                    continue;
                };
                if (node.hasChildNodes()) {
                    for (k = 0; k < node.childNodes.length; k++) {
                        if (node.childNodes[k].nodeType == 3) { // only text, no more childrens
                            if (spanWrapper(node.childNodes[k], pages, aliases)) {
                                matched = true;
                                continue loop1;
                            }
                            continue;
                        };
                        if (node.nodeType == 1) { // element node type, need to dig deeper
                            // these are already linked, skip
                            if (node.childNodes[k].hasAttribute("data-link-title")
                                || node.childNodes[k].hasAttribute("data-tag")
                                || node.childNodes[k].hasAttribute("recommend")) {
                                continue;
                            };
                        };
                    };
                };
            };
        };
    };
    return matched;
};

function runUnlinkFinder() {
    matchFound = false;
    setTimeout(function () {
        do {
            let blocks = document.getElementsByClassName("roam-block");
            matchFound = findTargetNodes(blocks, unlinkFinderPages, unlinkFinderAliases);
        } while (matchFound == true);
    }, 1000);
};

function unlinkFinder() {
    // blocks on the page where the button is clicked
    // get all pages in the graph
    unlinkFinderPages = getAllPages();
    unlinkFinderAliases = getAllAliases();
    matchFound = false;

    if (document.getElementById("unlink-finder-icon").getAttribute("status") == "off") {
        document.getElementById("unlink-finder-icon").setAttribute("status", "on");
        addUnlinkFinderLegend();
        reAddUnlinkTargets();
        do {
            let blocks = document.getElementsByClassName("roam-block");
            matchFound = findTargetNodes(blocks, unlinkFinderPages, unlinkFinderAliases);
        } while (matchFound == true);
        document.addEventListener("blur", runUnlinkFinder, true);
    } else {
        document.getElementById("unlink-finder-icon").setAttribute("status", "off");
        removeUnlinkFinderLegend();
        removeUnlinkTargets();
        document.removeEventListener("blur", runUnlinkFinder, true);
    };
};

function spanWrapper(node, pages, aliases) {
    try {
        for (const [key, value] of aliases.entries()) {
            if (node.textContent.toLowerCase().includes(key.toLowerCase())) {
                // iterate over the childNodes and do stuff on childNodes that 
                // don't have the data-link-title attribute
                start = node.textContent.toLowerCase().indexOf(key.toLowerCase());
                end = start + key.length;
                beforeLinkText = node.textContent.slice(0, start);
                firstCharBeforeMatch = node.textContent.slice(start - 1)[0];
                firstCharAfterMatch = node.textContent.slice(start).substr(key.length)[0];
                linkText = node.textContent.slice(start, end);
                afterLinkText = node.textContent.slice(end);
                // create span with page name
                var matchSpan = document.createElement("span");
                matchSpan.classList.add("unlink-finder");
                matchSpan.setAttribute("data-text", value);
                matchSpan.style.cssText += `position: relative; background: ${aliasWordMatchStyle}`;
                matchSpan.classList.add("alias-word-match");
                matchSpan.setAttribute("recommend", "underline");
                matchSpan.innerText = linkText;
                // truncate existing text node
                node.textContent = beforeLinkText;
                // add that span after the text node
                node.parentNode.insertBefore(matchSpan, node.nextSibling);
                // create a text node with the remainder text
                remainderText = document.createTextNode(afterLinkText);
                // add that remainder text after inserted node
                node.parentNode.insertBefore(remainderText, node.nextSibling.nextSibling);
                return true;
            };
        };
        for (l = 0; l < pages.length; l++) {
            if (pages[l].length < 2) {
                continue;
            }
            if (node.textContent.toLowerCase().includes(pages[l].toLowerCase())) {
                // iterate over the childNodes and do stuff on childNodes that 
                // don't have the data-link-title attribute
                start = node.textContent.toLowerCase().indexOf(pages[l].toLowerCase());
                end = start + pages[l].length;
                beforeLinkText = node.textContent.slice(0, start);
                firstCharBeforeMatch = node.textContent.slice(start - 1)[0];
                firstCharAfterMatch = node.textContent.slice(start).substr(pages[l].length)[0];
                linkText = node.textContent.slice(start, end);
                afterLinkText = node.textContent.slice(end);
                // create span with page name
                matchSpan = document.createElement("span");
                matchSpan.classList.add("unlink-finder");
                matchSpan.style.cssText += `background: ${exactWordMatchStyle}`;
                matchSpan.classList.add("exact-word-match");
                matchSpan.setAttribute("recommend", "underline");
                if (linkText != pages[l]) {
                    matchSpan.classList.add("fuzzy-word-match");
                    matchSpan.classList.remove("exact-word-match");
                    matchSpan.setAttribute("data-text", pages[l]);
                    matchSpan.style.cssText += `position:relative; background: ${fuzzyWordMatchStyle}`;
                };
                if ((firstCharAfterMatch != " " && end != node.textContent.length) || (firstCharBeforeMatch != " " && start != 0)) {
                    matchSpan.classList.add("partial-word-match");
                    matchSpan.classList.remove("exact-word-match");
                    matchSpan.style.cssText += `background: ${partialWordMatchStyle}`;
                };
                if (pageTaggedInParent(node, pages[l]) == true) {
                    matchSpan.classList.add("redundant-word-match");
                    matchSpan.classList.remove("exact-word-match");
                    matchSpan.style.cssText += `background: ${redundantWordMatchStyle}`;
                };
                matchSpan.innerText = linkText;
                // truncate existing text node
                node.textContent = beforeLinkText;
                // add that span after the text node
                node.parentNode.insertBefore(matchSpan, node.nextSibling);
                // create a text node with the remainder text
                remainderText = document.createTextNode(afterLinkText);
                // add that remainder text after inserted node
                node.parentNode.insertBefore(remainderText, node.nextSibling.nextSibling);
                return true;
            };
        };
    }
    catch (err) {
        return false;
    };
};

function removeUnlinkTargets() {
    targetNodes = document.getElementsByClassName("unlink-finder");
    for (i = 0; i < targetNodes.length; i++) {
        if (targetNodes[i].classList.contains("unlink-finder-legend")) {
            continue;
        };
        if (targetNodes[i].classList.contains("exact-word-match")) {
            targetNodes[i].classList.remove("exact-word-match");
            targetNodes[i].classList.add("exact-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
        if (targetNodes[i].classList.contains("fuzzy-word-match")) {
            targetNodes[i].classList.remove("fuzzy-word-match");
            targetNodes[i].classList.add("fuzzy-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
        if (targetNodes[i].classList.contains("partial-word-match")) {
            targetNodes[i].classList.remove("partial-word-match");
            targetNodes[i].classList.add("partial-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
        if (targetNodes[i].classList.contains("redundant-word-match")) {
            targetNodes[i].classList.remove("redundant-word-match");
            targetNodes[i].classList.add("redundant-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
        if (targetNodes[i].classList.contains("alias-word-match")) {
            targetNodes[i].classList.remove("alias-word-match");
            targetNodes[i].classList.add("alias-word-match-inactive");
            targetNodes[i].style.cssText = "";
        };
    };
};

function reAddUnlinkTargets() {
    targetNodes = document.getElementsByClassName("unlink-finder");
    for (i = 0; i < targetNodes.length; i++) {
        if (targetNodes[i].classList.contains("unlink-finder-legend")) {
            continue;
        };
        if (targetNodes[i].classList.contains("exact-word-match-inactive")) {
            targetNodes[i].classList.remove("exact-word-match-inactive");
            targetNodes[i].classList.add("exact-word-match");
            targetNodes[i].style.cssText = `background: ${exactWordMatchStyle}`;
        };
        if (targetNodes[i].classList.contains("fuzzy-word-match-inactive")) {
            targetNodes[i].classList.remove("fuzzy-word-match-inactive");
            targetNodes[i].classList.add("fuzzy-word-match");
            targetNodes[i].style.cssText = `position:relative; background: ${fuzzyWordMatchStyle}`;
        };
        if (targetNodes[i].classList.contains("partial-word-match-inactive")) {
            targetNodes[i].classList.remove("partial-word-match-inactive");
            targetNodes[i].classList.add("partial-word-match");
            targetNodes[i].style.cssText = `background: ${partialWordMatchStyle}`;
        };
        if (targetNodes[i].classList.contains("redundant-word-match-inactive")) {
            targetNodes[i].classList.remove("redundant-word-match-inactive");
            targetNodes[i].classList.add("redundant-word-match");
            targetNodes[i].style.cssText = `background: ${redundantWordMatchStyle}`;
        };
        if (targetNodes[i].classList.contains("alias-word-match-inactive")) {
            targetNodes[i].classList.remove("alias-word-match-inactive");
            targetNodes[i].classList.add("alias-word-match");
            targetNodes[i].style.cssText = `position: relative; background: ${aliasWordMatchStyle}`;
        };
    };
};

function removeUnlinkFinderLegend() {
    document.getElementById("unlink-finder-legend").remove();
};

function createUnlinkFinderLegendElement(matchType, matchStyle, matchText) {
    var matchSpan = document.createElement('span');
    matchSpan.classList.add('unlink-finder-legend');
    matchSpan.classList.add('unlink-finder');
    matchSpan.classList.add(matchType);
    matchSpan.innerText = matchText;
    matchSpan.setAttribute("data-text", "Actual Page Name")
    matchSpan.style.cssText = `margin-right: 4px; position:relative; background: ${matchStyle}`;
    return matchSpan;
}

function addUnlinkFinderLegend() {
    if (document.getElementById("unlink-finder-legend") == null) {
        var unlinkFinderLegend = document.createElement('div');
        unlinkFinderLegend.classList.add('unlink-finder-legend');
        unlinkFinderLegend.id = 'unlink-finder-legend';
        unlinkFinderLegend.setAttribute("style", "margin-left: 4px;");
        unlinkFinderLegend.style.cssText = "border-style: groove;"
        var legendKey = document.createElement('span');
        legendKey.classList.add('unlink-finder-legend');
        legendKey.classList.add('unlink-finder');
        legendKey.innerText = "Match Types: ";
        legendKey.style.cssText = "margin-left: 4px; margin-right: 4px;";
        var aliasWordMatch = createUnlinkFinderLegendElement("alias-word-match", aliasWordMatchStyle, "Alias");
        var exactWordMatch = createUnlinkFinderLegendElement("exact-word-match", exactWordMatchStyle, "Exact");
        var fuzzyWordMatch = createUnlinkFinderLegendElement("fuzzy-word-match", fuzzyWordMatchStyle, "Fuzzy");
        var partialWordMatch = createUnlinkFinderLegendElement("partial-word-match", partialWordMatchStyle, "Partial");
        var redundantWordMatch = createUnlinkFinderLegendElement("redundant-word-match", redundantWordMatchStyle, "Redundant");
        unlinkFinderLegend.appendChild(legendKey);
        unlinkFinderLegend.appendChild(aliasWordMatch);
        unlinkFinderLegend.appendChild(exactWordMatch);
        unlinkFinderLegend.appendChild(fuzzyWordMatch);
        unlinkFinderLegend.appendChild(partialWordMatch);
        unlinkFinderLegend.appendChild(redundantWordMatch);
        var roamTopbar = document.getElementsByClassName("roam-topbar");
        roamTopbar[0].childNodes[0].insertBefore(unlinkFinderLegend, roamTopbar[0].childNodes[0].childNodes[2]);
    }
}

function unlinkFinderButton() {
    var unlinkFinderButton = document.createElement('span');
    unlinkFinderButton.classList.add('bp3-popover-wrapper');
    unlinkFinderButton.setAttribute("style", "margin-left: 4px;")
    var spanTwo = document.createElement('span');
    spanTwo.classList.add('bp3-popover-target');
    unlinkFinderButton.appendChild(spanTwo);
    var unlinkFinderIcon = document.createElement('span');
    unlinkFinderIcon.id = 'unlink-finder-icon';
    unlinkFinderIcon.setAttribute("status", "off")
    unlinkFinderIcon.classList.add('bp3-icon-search-around', 'bp3-button', 'bp3-minimal', 'bp3-small');
    spanTwo.appendChild(unlinkFinderIcon);
    var roamTopbar = document.getElementsByClassName("roam-topbar");
    roamTopbar[0].childNodes[0].appendChild(unlinkFinderButton);
    unlinkFinderIcon.onclick = unlinkFinder;
};

getCSSProp = (element, propName) => getComputedStyle(element).getPropertyValue(propName);

if (document.getElementById("unlink-finder-icon") == null) {
    aliasWordMatchStyle = "rgba(125, 188, 255, 0.6)";
    exactWordMatchStyle = "rgba(71,151, 101, 0.4)";
    fuzzyWordMatchStyle = "rgba(220, 171, 121, 0.6)";
    partialWordMatchStyle = "rgba(229, 233, 236, 1.0)";
    redundantWordMatchStyle = "rgba(168, 42, 42, 0.4)";
    unlinkFinderButton();
};
