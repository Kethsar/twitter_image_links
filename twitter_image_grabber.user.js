// ==UserScript==
// @name        Twitter-Image-Grabber
// @description Easier copying of image links in tweets, with user for source
// @author      Kethsar
// @version     1.4.0
// @match       https://twitter.com/*
// @inject-into auto
// @grant       GM_setClipboard
// @grant       GM.setClipboard
// @updateURL   https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/twitter_image_grabber.user.js
// @downloadURL https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/twitter_image_grabber.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    /***** CONFIG *****/
    // Clicking the Images button for multi-image tweets will copy all image links
    // false to disable
    const COPY_ALL = true;
    /***** END CONFIG *****/
    
    const LEFT_CLICK = 0;
    
    var setClipboard = null,
        // store console.log because for some reason Twitter breaks it after fully loading, at least for me
        // No longer the case on nu-twitter but whatever
        log = console.log,
        interval = 0;
    
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
            log("Clipboard setter not found, image grabber disabled");
            return;
        }
        
        try
        {
            createEventListeners();
        }
        catch(e)
        {
            log(e);
        }
    }
    
    function createEventListeners()
    {
        document.addEventListener("click", hideOpenImglist);
        interval = setInterval(createThingsNu, 500);
    }
    
    function imgLinkClick(e)
    {
        if (e.button == LEFT_CLICK && !e.ctrlKey)
        {
            e.preventDefault();
            e.stopPropagation();
            setClipboard(e.target.href);
        }
    }
        
    function multiImageCopy(ele)
    {
        let links = Array.from(ele.parentElement.getElementsByClassName("imgLnk"));
        if (links.length < 1) return;

        let copyTxt = "";
        links.forEach(img => {
            if (img.href)
                copyTxt += img.href + " ";
        });
        
        if (copyTxt)
            setClipboard(copyTxt);
    }
    
    function hideOpenImglist(e)
    {
        if (!e.target.classList.contains("imgLnk"))
        {
            const next = e.target.nextElementSibling;
            if (!next || !next.classList.contains("imgList"))
            {
                const il = document.getElementById("imgList");
                if (il) il.style.visibility = "";
            }
        }
    }

    var btnDivClassList = null,
        imgLinkClassList = null;
    
    function createThingsNu()
    {
        if (document.readyState != "complete")
            return;
        
        clearInterval(interval);
        createStylesNu();
        createRootObserver();
        log("Image Grabber loaded");
    }

    function createStylesNu()
    {
        const css = document.createElement("style");
        css.innerHTML = `
            .imgList { position: absolute; z-index: 99; background-color: white; visibility: hidden; bottom: 20px; }
            .copybtn { text-decoration: none; }
            .copybtn:hover { color: red }
            .imgLnk { padding: 5px; color: black; display: block; font-size: 14px; }
            .not-following { color: red; }
        `;
        
        document.head.appendChild(css);
    }
  
    function createRootObserver() {
        const root = document.getElementById("react-root"),
              obs = new MutationObserver(rootHandler);
      
        obs.observe(root, {childList: true, subtree: true});
    }
  
    function rootHandler(mlist, obs) {
        // Images get lazy loaded but don't cause new mutations
        // Wait half a second before trying anything
        setTimeout(handleMutations, 500, mlist);
    }
    
    function handleMutations(mlist) {
        mlist.forEach(mtn => {
            mtn.addedNodes.forEach(an => {
                const modal = an.querySelector('[aria-modal]');
                if (modal) {
                    const images = modal.querySelectorAll('[src*="/media/"]');
                    if (images) {
                        createModalCopyBtnNu(modal);
                    }
                }
              
                const tweets = an.querySelectorAll('[data-testid="tweet"]');
                tweets.forEach(tweet => {
                    addCopyButtonNu(tweet);
                });
            });
        });
    }
    
    function createModalCopyBtnNu(modalDiv) {
        if (document.getElementById("modal-copy")) return; // If we already placed the button, don't bother doing it again.
        const actList = modalDiv.querySelector('[role="group"][aria-label]');
        if (!actList) return;
      
        const pnSplit = window.location.pathname.split("/"),
            imgNum = parseInt(pnSplit[pnSplit.length - 1]) - 1,
            uname = pnSplit[1];
      
        const btnDivCList = actList.children[0].classList,
            imgLinkCList = actList.querySelector('[dir]').classList,
            imgs = [modalDiv.getElementsByTagName("img")[imgNum].src];
      
        const cBtn = createCopyButtonNu(imgs, uname);
        cBtn.classList = btnDivCList;
        cBtn.children[0].classList = imgLinkCList;
        cBtn.children[0].classList.add("copybtn");
        cBtn.children[0].id = "modal-copy";
        actList.insertBefore(cBtn, actList.children[actList.childElementCount - 1]);

        const ul = modalDiv.getElementsByTagName("ul");
        if (ul.length > 0) {
            const arrowDiv = ul[0].parentElement.nextElementSibling;
            const outerDiv = ul[0].parentElement.parentElement.parentElement.parentElement; // This will ensure keyup is caught hopefully always
            arrowDiv.addEventListener("click", modalImageChangeHandlerNu);
            outerDiv.addEventListener("keyup", modalImageChangeHandlerNu);
        }
        
    }

    function modalImageChangeHandlerNu(e) {
        setTimeout(setModalLinkNu, 50); // Event fires before window.location changes, so just wait a bit
    }

    function setModalLinkNu() {
        const modalCopyBtn = document.getElementById("modal-copy");
        if (!modalCopyBtn) return;

        const pnSplit = window.location.pathname.split("/"),
            imgNum = parseInt(pnSplit[pnSplit.length - 1]) - 1,
            uname = pnSplit[1],
            imgList = document.getElementsByTagName("ul")[0], // Apparently the ul in the image pop-up modal is the only ul in the document
            imgs = imgList.getElementsByTagName("img"),
            image = imgs[imgNum].src;

        const format = image.match(/format=([^&]+)/)[1];
        let link = image.replace(/\?.*$/, "." + format + "?name=orig");

        if (uname)
            link = link + "#@" + uname;

        modalCopyBtn.href = link;
    }

    
    function getImagesNu(tdiv) {
        // Quote retweets with images in the quoted tweet end up being caught
        // by the usual selector. Grab the first image and look for the parent
        // div with an id attribute. Use the first child of that div as the 
        // root element containing images.
        const images = [];
        const fImg = tdiv.querySelector('[data-testid="tweetPhoto"]');
        if (!fImg) return images;
        
        let imgContainer = null,
            parent = fImg.parentElement,
            depth = 1;
        
        while (parent) {
            if (parent.hasAttribute('id')) {
                imgContainer = parent.children[0];
                break;
            }
            
            depth += 1;
            if (depth > 15) break; // save cycles, shouldn't be that high up, I think.
            
            parent = parent.parentElement;
        }
        if (!imgContainer) return images;
        
        const imgDivs = imgContainer.querySelectorAll('[data-testid="tweetPhoto"]');
        imgDivs.forEach(d => {
            const img = d.getElementsByTagName("img")[0];
            if (img) {
                images.push(img.src);
            }
        });

        // Images end up in the DOM as 1, 3, 2, 4 when there are 4
        // Fix the ordering
        if (images.length == 4) // max image count in a tweet
        { 
            const tmp = images[1];
            images[1] = images[2];
            images[2] = tmp;
        }

        return images;
    }

    function addCopyButtonNu(tweet) {
        const imgs = getImagesNu(tweet);
        if (imgs.length < 1) return;

        const actList = tweet.querySelector('[role="group"]');
        let uname = "";

        // Check for a previously added copy button and remove it
        const oldCBtn = actList.getElementsByClassName("copybtn");
        if (oldCBtn.length > 0) {
            let oldDiv = oldCBtn[0].parentElement;
            if (oldDiv.children.length > 1) oldDiv = oldDiv.parentElement;

            oldDiv.parentElement.removeChild(oldDiv);
        }

        if (!btnDivClassList || !imgLinkClassList) {
            // Match the class list of the rest of the tweet buttons
            btnDivClassList = actList.children[0].classList;
            // Match the class list of other inner div parts of the tweet buttons, mostly for text colour/styling
            imgLinkClassList = actList.querySelector('[dir]').classList;
        }

        // Search for user name in the most retarded way possible because it is not in a uniquely identifiable element in any way
        const spans = Array.from(tweet.getElementsByTagName("span"));
        spans.every(s => {
            // Apparently if a nick has an icon/emoji in it, it will be split into multiple spans
            // So if a nick is set as <something><emoji>@<something else> it will find that first
            // Thankfully the nick spans are within another span, where the user name span is inside a div
            if (s.parentElement.tagName != "DIV") return true; 
            
            if (s.innerText.search(/^@\S+$/) == 0) { // we check from the start so if a match is found it will always be index 0
                uname = s.innerText.substring(1);
                log('uname found');
                return false;
            }
        });
        const cBtn = createCopyButtonNu(imgs, uname);

        actList.appendChild(cBtn);
    }

    function createCopyButtonNu(images, uname)
    {
        const btnDiv = document.createElement("div");
        btnDiv.classList = btnDivClassList;
        btnDiv.classList.add("copyroot");
        
        if (images.length > 1)
        {
            const btn = document.createElement("a"), // "button", right
                imlDiv = document.createElement("div"),
                wrapDiv = document.createElement("div");
            
            btn.classList = imgLinkClassList;
            btn.classList.add("copybtn");
            btn.innerText = "Images";
            btn.href = "#";
            btn.addEventListener("click", function(e){
                e.preventDefault();
                
                const imgList = e.target.nextElementSibling;
                if (!imgList.style.visibility)
                {
                    imgList.style.visibility = "visible";
                    if (COPY_ALL) multiImageCopy(e.target);
                }
                else
                {
                    imgList.style.visibility = "";
                }
                
                if (imgList.id != "imgList")
                {
                    const il = document.getElementById("imgList");
                    if (il)
                    {
                        il.id = "";
                        il.style.visibility = "";
                    }
                    
                    imgList.id = "imgList";
                }
            });
            
            imlDiv.classList.add("imgList");
            wrapDiv.classList = imgLinkClassList;
            
            for (let i = 0; i < images.length; i++)
            {
                const format = images[i].match(/format=([^&]+)/)[1];
                let link = images[i].replace(/\?.*$/, "." + format + "?name=orig");

                if (uname)
                    link = link + "#@" + uname;
                
                const a = createBtnForLinkNu(link, i+1);
                imlDiv.appendChild(a);
            }

            wrapDiv.appendChild(btn);
            wrapDiv.appendChild(imlDiv);
            btnDiv.appendChild(wrapDiv);
        }
        else
        {
            const format = images[0].match(/format=([^&]+)/)[1];
            let link = images[0].replace(/\?.*$/, "." + format + "?name=orig");

            if (uname)
                link = link + "#@" + uname;

            const btn = createBtnForLinkNu(link, 0);
            btnDiv.appendChild(btn);
        }
        
        return btnDiv;
    }

    function createBtnForLinkNu(link, num)
    {
        const btn = document.createElement("a");
        btn.href = link;
        btn.addEventListener("click", imgLinkClick);
        
        if (num == 0)
        {
            btn.classList = imgLinkClassList;
            btn.innerText = "Copy";
        }
        else
        {
            btn.innerText = "Copy " + (num);
            btn.classList.add("imgLnk");
        }
        btn.classList.add("copybtn");
        
        return btn;
    }
    
    init();
})();
