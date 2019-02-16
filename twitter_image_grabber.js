// ==UserScript==
// @name Twitter Image Grabber
// @namespace Violentmonkey Scripts
// @description Easier copying of image links in tweets, with user for source
// @author Kethsar
// @match https://twitter.com/*
// @inject-into auto
// @grant GM_setClipboard
// @grant GM.setClipboard
// ==/UserScript==

(function() {
    'use strict';
    
    /***** CONFIG *****/
    // Set to true to allow middle-clicking tweet images to copy links
    // Copies links for all images by default
    // Ctrl+middle-clicking will copy the link only for the image clicked on
    // false to disable
    const USE_MIDDLE_CLICK = true;
    
    // Set to true to show the Copy "buttons" on tweets with images
    // false to disable
    const SHOW_COPY_BUTTONS = true;
    /***** END CONFIG *****/
    
    const LEFT_CLICK = 0,
          MIDDLE_CLICK = 1;
    
    var setClipboard = null,
        log = console.log; // store console.log because for some reason Twitter fucks it after fully loading, at least for me
    
    function init()
    {
        if (GM_setClipboard)
        {
            setClipboard = GM_setClipboard;
        }
        else if (typeof(GM) != "undefined" && GM.setClipboard)
        {
            setClipboard = GM.setClipboard;
        }
        else
        {
            console.log("Clipboard setter not found, image grabber disabled");
            return;
        }
        
        createEventListeners();
        log("Image Grabber loaded");
    }
    
    function createEventListeners()
    {
        if (USE_MIDDLE_CLICK)
            document.addEventListener('mousedown', mousedownHandler);
        
        if (SHOW_COPY_BUTTONS)
        {
            document.addEventListener("click", hideOpenImglist);
            document.addEventListener("readystatechange", createThings);
        }
    }
    
    function mousedownHandler(e)
    {
        if (e.button == MIDDLE_CLICK)
        {
            let ele = e.target,
                tag = ele.tagName.toLowerCase();
            
            if (tag != "img" && !ele.classList.contains("GalleryNav"))
                return; // Only copy things if images were clicked
            
            while (!(ele.classList.contains('tweet') || ele.classList.contains('Gallery-content'))
                   && ele != null)
            {
                ele = ele.parentElement;
            }

            if (ele)
            {
                e.preventDefault();
                if (ele.classList.contains('Gallery-content'))
                    ele = ele.getElementsByClassName("tweet")[0];
                
                let uname = ele.attributes.getNamedItem("data-screen-name"),
                    images = [];

                if (uname) uname = uname.value;

                if (!e.ctrlKey)
                {
                    let imgEles = ele.getElementsByClassName("js-adaptive-photo");
                    for (let imge of imgEles)
                    {
                        let link = imge.attributes.getNamedItem("data-image-url").value;
                        if (link)
                        {
                            link = link + "?name=orig";
                            images.push(link);
                        }
                    }

                    if (images.length == 1)
                        images[0] = images[0] + "#@" + uname;
                }
                else
                {
                    let imgele = null;
                    if (e.target.tagName.toLowerCase() == "img")
                    {
                        imgele = e.target;
                    }
                    else if (e.target.classList.contains("GalleryNav"))
                    {
                        imgele = e.target.parentElement.getElementsByClassName("media-image")[0];
                    }
                    
                    if (imgele)
                    {
                        let src = imgele.src.replace(/:[a-zA-Z]{1,10}$/, "");
                        images.push(src + "?name=orig#@" + uname);
                    }
                }

                if (images.length > 0)
                {
                    let copyTxt = "";
                    for (let i of images)
                    {
                        copyTxt += i + " | ";
                    }

                    if (images.length > 1)
                        copyTxt += "twitter: @" + uname;

                    copyTxt = copyTxt.replace(/[ |]+$/, "");
                    setClipboard(copyTxt);
                }
            }
        }
    }
    
    function createThings()
    {
        createStyles();
        createStreamObserver();
        createContainerObserver();
        createPlinkOlayObserver();
        createGalleryObserver();
    }
    
    function createStyles()
    {
        let css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = ".imgList { position: absolute; z-index: 99; background-color: white; visibility: hidden; }\n" +
                        ".imgLnk { padding: 5px; color: black; display: block; font-size: 14px; }\n" +
                        ".imgLnk:hover { color:red }";
        
        document.head.appendChild(css);
    }
    
    function createStreamObserver(strim)
    {
        if (!strim)
            strim = document.getElementById("stream-items-id");
        
        let tweets = strim.getElementsByClassName("tweet"),
            strimObsCfg = {childList: true},
            strimo = new MutationObserver(streamObserveHandler);
        
        addCopyButtons(tweets);
        
        strimo.observe(strim, strimObsCfg);
    }
    
    function streamObserveHandler(mlist, obs)
    {
        for (let m of mlist)
        {
            for (let an of m.addedNodes)
            {
                let tweets = an.getElementsByClassName("tweet");
                addCopyButtons(tweets);
            }
        }
    }
    
    function createContainerObserver()
    {
        let pc = document.getElementById("page-container"),
            pcObsCfg = {childList: true},
            pcmo = new MutationObserver(containerObserveHandler);

        pcmo.observe(pc, pcObsCfg);
    }
    
    function containerObserveHandler(mlist, obs)
    {
        for (let m of mlist)
        {
            for (let an of m.addedNodes)
            {
                if (an.nodeName.toLowerCase() == "div" &&
                   (an.id == "timeline" || an.classList.contains("AppContainer")))
                {
                    createStreamObserver();
                    break;
                }
            }
        }
    }
    
    function createGalleryObserver()
    {
        // Turns out the GalleryTweet is replaced each time the image in the gallery is changed
        // Even if it is an image for the same tweet. That you are cycling through
        // Well, makes things easier for me, cause the Gallery Tweet doesn't load in as fast as the actual image
        // making it so the copy button could not be made if I observed for changes to the gallery image
        let galleryTweet = document.getElementsByClassName("GalleryTweet")[0],
            galleryObsCfg = {childList: true},
            gtmo = new MutationObserver(galleryObserveHandler);
        
        gtmo.observe(galleryTweet, galleryObsCfg);
    }
    
    function galleryObserveHandler(mlist, obs){
        for (let m of mlist)
        {
            if (m.addedNodes.length > 0)
            {
                // It should just be one, if any, since it's one image
                let tweet = m.target.getElementsByClassName("tweet")[0],
                    uname = tweet.attributes.getNamedItem("data-screen-name"),
                    actList = tweet.getElementsByClassName("ProfileTweet-actionList")[0],
                    img = document.getElementsByClassName("media-image")[0];

                if (uname)
                    uname = uname.value;

                let cBtn = createCopyButton([img], uname),
                    actlast = actList.children.length - 1;
                
                actList.insertBefore(cBtn, actList.children[actlast]);
            }
        }
    }
    
    function createPlinkOlayObserver()
    {
        let plinkOlay = document.getElementsByClassName("PermalinkOverlay")[0],
            plinkOlayBody = plinkOlay.getElementsByClassName("PermalinkOverlay-body")[0],
            poObsCfg = {childList: true},
            pomo = new MutationObserver(plinkolayObserveHandler);
        
        if (plinkOlay.classList.contains("load-at-boot"))
            addBtnsToPlinkOlay(plinkOlayBody);
        
        pomo.observe(plinkOlayBody, poObsCfg);
    }
    
    function plinkolayObserveHandler(mlist, obs)
    {
        for (let m of mlist)
        {
            if (m.addedNodes.length > 0)
            {
                addBtnsToPlinkOlay(m.target);
                break;
            }
        }
    }
    
    function addBtnsToPlinkOlay(plinkOlay)
    {
        let tc = plinkOlay.getElementsByClassName("permalink-tweet-container")[0],
            tweet = tc.getElementsByClassName("tweet");

        addCopyButtons(tweet);

        // This is fine because this function is only called once upon the permalink overlay popping-up
        let strims = plinkOlay.getElementsByClassName("js-navigable-stream");
        if (strims.length > 0)
        {
            createStreamObserver(strims[0]);
        }
    }
    
    function addCopyButtons(tweets)
    {
        for (let t of tweets)
        {
            addCopyButton(t);
        }
    }
    
    function addCopyButton(tweet)
    {
        if (tweet && tweet.classList.contains("has-content"))
        {
            let imgEles = tweet.getElementsByClassName("js-adaptive-photo"),
                uname = tweet.attributes.getNamedItem("data-screen-name"),
                cBtns = tweet.getElementsByClassName("cimgLnk");
            
            if (imgEles.length < 1)
                return;
            
            if (uname)
                uname = uname.value;
            
            // this tweet had copy buttons added to it before, and they have persisted
            // However, the event handlers have been wiped. Remove and redo them
            if (cBtns.length > 0)
            {
                let ele = cBtns[0];
                for (let i = 0; i < 5; i++) // built-in loop limiter haha
                {
                    ele = ele.parentElement;
                    if (ele && ele.classList.contains("ProfileTweet-action"))
                    {
                        ele.remove();
                        break;
                    }
                }
            }
            
            let actList = tweet.getElementsByClassName("ProfileTweet-actionList")[0];
            let cBtn = createCopyButton(imgEles, uname);
            
            actList.appendChild(cBtn);
        }
    }
    
    function createCopyButton(imgEles, uname)
    {
        let btnDiv = document.createElement("div");
        btnDiv.classList.add("ProfileTweet-action");
        
        if (imgEles.length > 1)
        {
            let btn = document.createElement("a"), // "button", right
                imlDiv = document.createElement("div"),
                wrapDiv = document.createElement("div");
            
            btn.classList.add("ProfileTweet-actionButton");
            btn.innerText = "Images";
            btn.href = "#";
            btn.addEventListener("click", function(e){
                e.preventDefault();
                
                let imgList = e.target.nextElementSibling;
                if (!imgList.style.visibility)
                    imgList.style.visibility = "visible";
                else
                    imgList.style.visibility = "";
                
                if (imgList.id != "imgList")
                {
                    let il = document.getElementById("imgList");
                    if (il)
                    {
                        il.id = "";
                        il.style.visibility = "";
                    }
                    
                    imgList.id = "imgList";
                }
            });
            
            imlDiv.classList.add("imgList");
            wrapDiv.classList.add("ProfileTweet-actionButton");
            
            for (let i = 0; i < imgEles.length; i++)
            {
                let link = "",
                    ele = imgEles[i];
                
                if (ele.tagName.toLowerCase() == "div")
                    link = ele.attributes.getNamedItem("data-image-url").value;
                else if (ele.tagName.toLowerCase() == "img")
                    link = ele.src.replace(/:[a-zA-Z]{1,10}$/, "");
                
                if (link)
                {
                    link = link + "?name=orig";
                    if (uname)
                        link = link + "#@" + uname;
                    
                    let a = createBtnForLink(link, i+1);
                    imlDiv.appendChild(a);
                }
            }

            wrapDiv.appendChild(btn);
            wrapDiv.appendChild(imlDiv);
            btnDiv.appendChild(wrapDiv);
        }
        else
        {
            let link = "",
                ele = imgEles[0];
            
            if (ele.tagName.toLowerCase() == "div")
                link = ele.attributes.getNamedItem("data-image-url").value;
            else if (ele.tagName.toLowerCase() == "img")
                link = ele.src.replace(/:[a-zA-Z]{1,10}$/, "");
            
            if (link)
            {
                link = link + "?name=orig";
                if (uname)
                    link = link + "#@" + uname;

                let btn = createBtnForLink(link, 0);
                btnDiv.appendChild(btn);
            }
        }
        
        return btnDiv;
    }
    
    function createBtnForLink(link, num)
    {
        let btn = document.createElement("a"); // "button", right
        btn.classList.add("cimgLnk");
        btn.href = link;
        btn.addEventListener("click", imgLnkClick);
        
        if (num == 0)
        {
            btn.classList.add("ProfileTweet-actionButton");
            btn.innerText = "Copy";
        }
        else
        {
            btn.innerText = "Copy " + (num);
            btn.classList.add("imgLnk");
        }
        
        return btn;
    }
    
    function imgLnkClick(e)
    {
        if (e.button == LEFT_CLICK && !e.ctrlKey)
        {
            e.preventDefault();
            setClipboard(e.target.href);
        }
    }
    
    function hideOpenImglist(e){
            if (!e.target.classList.contains("imgLnk"))
            {
                let next = e.target.nextElementSibling;
                if (!next || !next.classList.contains("imgList"))
                {
                    let il = document.getElementById("imgList");
                    if (il) il.style.visibility = "";
                }
            }
        }
    
    init();
})();
