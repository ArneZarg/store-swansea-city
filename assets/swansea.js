//CUSTOM PRINT PREVIEW

// Cache for generated images to avoid re-rendering
const previewImageCache = new Map();

if (
  document.getElementById("preview-container-custom") ||
  document.getElementById("preview-container-player")
) {
  document.body.addEventListener("keyup", async function (e) {
    if (e.target.matches('input[name="properties[Number]"]')) {
      const input = e.target;
      const result = limitString(input.value, 2);
      input.value = result;
      await generatePreviewImage();
    } else if (e.target.matches('input[name="properties[Name]"]')) {
      const input = e.target;
      const fallbackLimit = 14;
      const result = limitString(
        input.value,
        window.product?.personalisation?.character_limit ?? fallbackLimit
      );
      input.value = result;
      await generatePreviewImage();
    }
  });

  document.body.addEventListener("click", async function (e) {
    if (e.target.matches("#player_button")) {
      const playerSelect = document.getElementById("playerSelect");
      if (playerSelect) {
        updatePlayerProperties(playerSelect);
      }
    } else if (e.target.matches("select[id=playerSelect]")) {
      // Add player select change handler
      updatePlayerProperties(e.target);
    } else if (e.target.matches('select[name="properties[Shirt Printing]"]')) {
      await generatePreviewImage();
    }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    const nameInput = document.querySelector('input[name="properties[Name]"]');
    const numberInput = document.querySelector(
      'input[name="properties[Number]"]'
    );

    if (nameInput) {
      // Validate when input is unfocused
      nameInput.addEventListener("blur", validateKitBuilderInputs);
      // Clear existing errors on input change
      nameInput.addEventListener("input", function () {
        const nameError = document.getElementById("name-error");
        if (this.classList.contains("invalid")) {
          clearFieldError(this, nameError);
        }
      });
    }

    if (numberInput) {
      // Validate when input is unfocused
      numberInput.addEventListener("blur", validateKitBuilderInputs);
      // Clear existing errors on input change
      numberInput.addEventListener("input", function () {
        const numberError = document.getElementById("number-error");
        if (this.classList.contains("invalid")) {
          clearFieldError(this, numberError);
        }
      });
    }

    // Hook into form submission
    const productForm = document.querySelector(
      'form[data-type="add-to-cart-form"]'
    );
    if (productForm) {
      productForm.addEventListener("submit", function (e) {
        // Only validate if custom personalization is selected
        const customSection = document.querySelector(".kit_builder__custom");
        if (customSection && customSection.style.display !== "none") {
          if (!validateKitBuilderInputs()) {
            console.log("Validation failed");
            e.preventDefault();
            return false;
          }
        }
      });
      // Disable default form validation popup on fields & validate on submit
      document.addEventListener(
        "invalid",
        (function () {
          return function (e) {
            if (
              e.target.name === "properties[Name]" ||
              e.target.name === "properties[Number]"
            ) {
              e.preventDefault();
              validateKitBuilderInputs();
            }
          };
        })(),
        true
      );
    }

    if (window.product?.template === "kit") {
      kitBuilderInit();
      await generatePreviewImage();
    } else if (window.product?.template === "training") {
      kitBuilderInit();
      await generateTrainingPreviewImage();
    }
  });
}

// Generate composite image using canvas
async function generatePreviewImage() {
  const previewContainer =
    document
      .getElementById("previewName")
      ?.closest('[class*="shirt"], [class*="preview"], [class*="image"]') ||
    document.querySelector(
      '.product-media img, .product__media img, [class*="shirt-image"]'
    );

  if (!previewContainer) return;

  let name = " ";
  let number = "";

  // Get current values
  const personalisedInput = document.querySelector(
    'input[name="properties[_personalisedType]"]'
  );
  const personalised = personalisedInput ? personalisedInput.value : "";

  switch (personalised) {
    case "Custom":
      const nameInput = document.querySelector(
        'input[name="properties[Name]"]'
      );
      const numberInput = document.querySelector(
        'input[name="properties[Number]"]'
      );
      name = nameInput ? nameInput.value : "";
      number = numberInput ? numberInput.value : "";
      break;
    case "Player":
      const playerSelect = document.getElementById("playerSelect");
      if (playerSelect) {
        const playerID = playerSelect.value;
        const player = window.product?.kit_builder?.players?.find(
          (obj) => obj.id === playerID
        );
        if (player) {
          name = player.name.toUpperCase();
          number = player.number;
        }
      }
      break;
  }

  // Create cache key
  const cacheKey = `${name}-${number}-${personalised}`;

  // Check cache first
  if (previewImageCache.has(cacheKey)) {
    displayPreviewImage(previewImageCache.get(cacheKey), personalised);
    return;
  }

  // Create canvas for compositing
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size (use a consistent high resolution)
  const baseWidth = 800;
  const baseHeight = 1000;
  canvas.width = baseWidth;
  canvas.height = baseHeight;

  try {
    // Load shirt image
    const shirtImg = await loadImage(getActiveShirtImageSrc());
    // Draw shirt image
    ctx.drawImage(shirtImg, 0, 0, baseWidth, baseHeight);

    // Calculate font sizes based on canvas size
    const baseFontSize =
      name.length >= 7 ? baseWidth * 0.055 : baseWidth * 0.065;
    const numberSize = baseWidth * 0.28;

    // Draw name
    if (name && name.trim() !== "") {
      await drawNameOnCanvas(ctx, name, baseWidth, baseHeight, baseFontSize);
    }

    // Draw numbers
    if (number && number.trim() !== "") {
      await drawNumbersOnCanvas(ctx, number, baseWidth, baseHeight, numberSize);
    }

    // Convert canvas to image data URL
    const imageDataUrl = canvas.toDataURL("image/png", 0.9);

    // Cache the result
    previewImageCache.set(cacheKey, imageDataUrl);
    // Display the image
    displayPreviewImage(imageDataUrl, personalised);
  } catch (error) {
    console.error("Error generating preview image:", error);
    // Fallback to original DOM method
    printPreview();
  }
}

async function drawNameOnCanvas(
  ctx,
  name,
  canvasWidth,
  canvasHeight,
  fontSize
) {
  const textColor = window.product?.kit_builder?.text_color ?? "black";
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${fontSize}px "EFL2022", monospace`;

  if (name.length >= 4) {
    // Draw curved text for longer names
    await drawCurvedText(ctx, name, canvasWidth, canvasHeight);
  } else {
    // Draw straight text for shorter names
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight * 0.15;
    ctx.fillText(name, centerX, centerY);
  }
}

async function drawCurvedText(ctx, text, canvasWidth, canvasHeight) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight * 0.27;
  const radiusX = canvasWidth * 0.205; // Horizontal radius - wider for flatter top
  const radiusY = canvasWidth * 0.16; // Vertical radius

  // Spacing between characters
  const angleStep = Math.PI * 0.09;

  // Calculates the actual arc that will be used based on the final character spacing
  const actualArc = angleStep * (text.length - 1);
  // Sets the starting angle to center the text on the arc (negative half of total arc)
  const startAngle = -actualArc / 2;

  // Save the current context
  ctx.save();

  // Track the previous character's position and angle to detect direction changes
  // When the direction changes, we need to clamp the angle to prevent the text from curving back inwards.
  let dx = 0;
  let prevX = 0;
  let prevAngle = 0;

  // Draw each character
  for (let i = 0; i < text.length; i++) {
    // Calculates the character's angle along the arc
    let angle = startAngle + i * angleStep;

    // Calculate position on the ellipse
    let x = centerX + Math.sin(angle) * radiusX;
    const y = centerY - Math.cos(angle) * radiusY;

    const newDx = x - prevX;
    if (i > 0 && Math.sign(newDx) !== Math.sign(dx)) {
      // dont change x or angle if it is beginning to curve back inwards (change of direction).
      x = prevX;
      angle = prevAngle > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      prevAngle = angle;
      prevX = x;
      dx = newDx;
    }

    // Save context for this character
    ctx.save();
    // Move to character position
    ctx.translate(x, y);
    // Rotate to be tangent to the circle
    ctx.rotate(angle);
    // Draw the character
    ctx.fillText(text[i], 0, 0);
    // Restore context for the next character
    ctx.restore();
  }

  // Restore the original context
  ctx.restore();
}

async function drawNumbersOnCanvas(
  ctx,
  number,
  canvasWidth,
  canvasHeight,
  numberSize
) {
  const digits = number.split("");
  const y = canvasHeight * 0.22;

  let targetWidth = 0;
  let targetHeight = 0;
  let startX = 0;
  let numberSpacing = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = digits[i];
    const numberImageSrc = getNumberImageSrc(digit);

    if (numberImageSrc) {
      try {
        const numberImg = await loadImage(numberImageSrc);

        // Calculate dimensions that preserve aspect ratio only on first iterations
        if (!targetWidth || !targetHeight) {
          // Calculate dimensions that preserve aspect ratio
          const originalAspectRatio = numberImg.width / numberImg.height;
          targetHeight = numberSize;
          targetWidth = targetHeight * originalAspectRatio;

          // Add some padding between numbers
          numberSpacing = targetWidth * -0.4;
          // Calculate total width of all numbers plus spacing
          const totalWidth =
            targetWidth * digits.length + numberSpacing * (digits.length - 1);
          // Center the entire number group
          startX = (canvasWidth - totalWidth) / 2;
        }
        const x = startX + i * (targetWidth + numberSpacing);

        ctx.drawImage(numberImg, x, y, targetWidth, targetHeight);
      } catch (error) {
        console.log("Error displaying kit number:", error);
      }
    }
  }
}

function displayPreviewImage(imageDataUrl, personalised) {
  // Replace the existing preview elements with a single images
  const previewContainer = document.getElementById(
    `preview-container-${personalised.toLowerCase()}`
  );
  if (previewContainer) {
    // Create or update preview image
    let previewImg = previewContainer.querySelector("#preview-img");
    if (!previewImg) {
      previewImg = document.createElement("img");
      previewImg.id = "preview-img";
      previewContainer.appendChild(previewImg);
    }
    previewImg.src = imageDataUrl;
  }
}

// Helper functions
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getActiveShirtImageSrc() {
  return window.product?.kit_builder?.back_shirt_image ?? "";
}

function getNumberImageSrc(digit) {
  const numberData = window.product?.kit_builder?.shirt_numbers?.find(
    (num) => num.number == digit
  );
  return numberData ? numberData.image : null;
}

async function generateTrainingPreviewImage() {
  // Similar implementation for training template
  const previewContainer =
    document.getElementById("previewInitals")?.parentElement;
  if (!previewContainer) return;

  const initialsInput = document.querySelector(
    'input[name="properties[Initials]"]'
  );
  const initials = initialsInput ? initialsInput.value.toUpperCase() : "";

  const cacheKey = `training-${initials}`;

  if (previewImageCache.has(cacheKey)) {
    displayTrainingPreviewImage(previewImageCache.get(cacheKey));
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 800;
  canvas.height = 1000;

  try {
    const shirtImg = await loadImage(getActiveShirtImageSrc());
    ctx.drawImage(shirtImg, 0, 0, 800, 1000);

    if (initials && initials.trim() !== "") {
      const textColor = window.product?.kit_builder?.text_color ?? "black";
      ctx.fillStyle = textColor;
      ctx.font = "bold 60px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(initials, 200, 200); // Adjust position as needed
    }

    const imageDataUrl = canvas.toDataURL("image/png", 0.9);
    previewImageCache.set(cacheKey, imageDataUrl);
    displayTrainingPreviewImage(imageDataUrl);
  } catch (error) {
    console.error("Error generating training preview image:", error);
    trainingPrintPreview();
  }
}

function displayTrainingPreviewImage(imageDataUrl) {
  const previewContainer =
    document.getElementById("previewInitals")?.parentElement;
  if (!previewContainer) return;

  document.getElementById("previewInitals").style.display = "none";

  let previewImg = previewContainer.querySelector("#trainingCompositePreview");
  if (!previewImg) {
    previewImg = document.createElement("img");
    previewImg.id = "trainingCompositePreview";
    previewImg.style.position = "absolute";
    previewImg.style.top = "0";
    previewImg.style.left = "0";
    previewImg.style.width = "100%";
    previewImg.style.height = "100%";
    previewImg.style.objectFit = "contain";
    previewContainer.appendChild(previewImg);
  }

  previewImg.src = imageDataUrl;
}

function kitBuilderInit() {
  const urlParams = new URLSearchParams(window.location.search);
  const kbt = urlParams.get("kbt");
  const id = urlParams.get("playerid");
  const name = urlParams.get("name");
  const number = urlParams.get("number");

  if (kbt != null) {
    switch (kbt.toLowerCase()) {
      case "custom":
        const customButton = document.getElementById("custom_button");
        customPrinting(customButton, "custom");
        const nameInput = document.querySelector(
          'input[name="properties[Name]"]'
        );
        if (nameInput && name) {
          nameInput.value = name.substring(
            0,
            window.product.personalisation.character_limit
          );
        }
        const numberInput = document.querySelector(
          'input[name="properties[Number]"]'
        );
        if (numberInput && number) {
          numberInput.value = number.substring(0, 2);
        }
        // Use the new canvas-based approach
        if (window.product?.template === "kit") {
          generatePreviewImage();
        } else if (window.product?.template === "training") {
          generateTrainingPreviewImage();
        }
        break;
      case "player":
        const customBtn = document.getElementById("custom_button");
        customPrinting(customBtn, "player");
        const playerSelect = document.getElementById("playerSelect");
        if (playerSelect) {
          const option = playerSelect.querySelector(
            `option[data-product-id="${id}"]`
          );
          if (option) {
            playerSelect.value = option.value;
          }
        }
        // Use the new canvas-based approach
        if (window.product?.template === "kit") {
          generatePreviewImage();
        } else if (window.product?.template === "training") {
          generateTrainingPreviewImage();
        }
        break;
    }
  }
}

function printPreview() {
  let name = " ";
  let number = "";
  let digit1 = "";
  let digit2 = "";

  // HANDLE IMAGES
  displayActiveShirt();

  // display text
  const personalisedInput = document.querySelector(
    'input[name="properties[_personalisedType]"]'
  );
  const personalised = personalisedInput ? personalisedInput.value : "";

  switch (personalised) {
    case "Custom":
      const nameInput = document.querySelector(
        'input[name="properties[Name]"]'
      );
      const numberInput = document.querySelector(
        'input[name="properties[Number]"]'
      );
      name = nameInput ? nameInput.value : "";
      number = numberInput ? numberInput.value : "";
      break;
    case "Player":
      const playerSelect = document.getElementById("playerSelect");
      if (playerSelect) {
        const playerID = playerSelect.value;
        const player = window.product.players.find(
          (obj) => obj.id === playerID
        );
        if (player) {
          name = player.name.toUpperCase();
          number = player.number;

          const nameInputPlayer = document.querySelector(
            'input[name="properties[Name]"]'
          );
          const numberInputPlayer = document.querySelector(
            'input[name="properties[Number]"]'
          );
          if (nameInputPlayer) nameInputPlayer.value = name;
          if (numberInputPlayer) numberInputPlayer.value = number;
        }
      }
      break;
  }

  // find the digits
  if (number.length >= 1) {
    digit1 = number.trim().substring(0, 1);
    for (const element of window.product.shirt_numbers) {
      if (element.number == digit1) {
        digit1 = element.image;
        break;
      }
    }
  }
  if (number.length >= 2) {
    digit2 = number.trim().substring(1, 2);
    for (const element of window.product.shirt_numbers) {
      if (element.number == digit2) {
        digit2 = element.image;
        break;
      }
    }
  }

  const previewName = document.getElementById("previewName");
  if (previewName) {
    if (name.length >= 4) {
      const fontSize = previewName.style.fontSize.replace("px", "");

      // Get container dimensions for proper SVG scaling
      const container =
        previewName.closest(
          '[class*="shirt"], [class*="preview"], [class*="image"]'
        ) || previewName.parentElement;
      let containerWidth = 300; // Default SVG viewBox width

      if (container) {
        const rect = container.getBoundingClientRect();
        containerWidth = rect.width;
      }

      // Scale the SVG viewBox and font size proportionally
      // const svgWidth = containerWidth;
      const svgWidth = Math.max(300, containerWidth * 0.8);
      const svgHeight = svgWidth / 3; // Maintain aspect ratio
      const curvedFontSize = parseFloat(fontSize) * 0.9; // Slightly smaller for curved text
      const svg = `
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" stroke="none" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">
          <path id="CurvePath" d="
            M ${svgWidth * 0.3},${svgHeight * 0.95}
            A ${svgWidth * 0.2},${svgWidth * 0.2} 0 0 1 ${svgWidth * 0.7},${
        svgHeight * 0.95
      }
          "></path>
          <text font-size="${curvedFontSize}px" fill="black" font-weight="bold">
            <textPath xlink:href="#CurvePath" startOffset="50%" text-anchor="middle">
              ${name}
            </textPath>
          </text>
        </svg>
      `;
      previewName.innerHTML = svg;
      previewName.style.marginTop = "11%";
      previewName.style.fontWeight = "bold";
    } else {
      previewName.textContent = name;
    }
  }

  const digit1Element = document.getElementById("digit1");
  if (digit1Element) {
    digit1Element.innerHTML = digit1
      ? `<img src="${digit1}" alt="digit 1">`
      : "";
  }

  const digit2Element = document.getElementById("digit2");
  if (digit2Element) {
    digit2Element.innerHTML = digit2
      ? `<img src="${digit2}" alt="digit 2">`
      : "";
  }
}

// Toggle the required attribute on the name and number inputs (used when swapping between custom, player and none)
function toggleCustomInputRequired(required) {
  const nameInput = document.querySelector('input[name="properties[Name]"]');
  const numberInput = document.querySelector(
    'input[name="properties[Number]"]'
  );
  if (nameInput) nameInput.required = required;
  if (numberInput) numberInput.required = required;
}

function customPrinting(ele, type, currency = "£") {
  const nameInput = document.querySelector('input[name="properties[Name]"]');
  const numberInput = document.querySelector(
    'input[name="properties[Number]"]'
  );
  const initialsInput = document.querySelector(
    'input[name="properties[Initials]"]'
  );
  const personalisedInput = document.querySelector(
    'input[name="properties[Personalised]"]'
  );
  const personalisedTypeInput = document.querySelector(
    'input[name="properties[_personalisedType]"]'
  );

  if (nameInput) nameInput.value = "";
  if (numberInput) numberInput.value = "";
  if (initialsInput) initialsInput.value = "";

  const buttons = document.querySelectorAll(".kit_builder__button");
  buttons.forEach((button) => button.classList.remove("active"));
  ele.classList.add("active");

  const customBuilder = document.querySelector(".kit_builder__custom");
  const playerBuilder = document.querySelector(".kit_builder__player");
  const personalisedPrice = document.querySelector(
    'input[name="properties[_personalisePrice]"]'
  );

  switch (type) {
    case "none":
      if (customBuilder) customBuilder.style.display = "none";
      if (playerBuilder) playerBuilder.style.display = "none";
      if (personalisedInput) personalisedInput.value = "None";
      toggleCustomInputRequired(false);
      break;
    case "custom":
      if (customBuilder) customBuilder.style.display = "block";
      if (playerBuilder) playerBuilder.style.display = "none";
      if (personalisedInput) {
        personalisedInput.value = `Custom (${currency}${personalisedPrice.value})`;
      }
      if (personalisedTypeInput) {
        personalisedTypeInput.value = "Custom";
      }
      // Only require the input fields when they are visible to avoid validation on hidden inputs
      toggleCustomInputRequired(true);
      break;
    case "player":
      if (customBuilder) customBuilder.style.display = "none";
      if (playerBuilder) playerBuilder.style.display = "block";
      if (personalisedInput) {
        personalisedInput.value = `Player (${currency}${personalisedPrice.value})`;
      }
      if (personalisedTypeInput) {
        personalisedTypeInput.value = "Player";
      }
      toggleCustomInputRequired(false);
      break;
  }

  // Use the new canvas-based approach
  if (window.product?.template === "kit") {
    generatePreviewImage();
    updateKitBuilderPrice();
  } else if (window.product?.template === "training") {
    generateTrainingPreviewImage();
    updateKitBuilderPrice();
  }
}

function setDefaultProductPrice() {
  // Only set the values but dont update via updateKitBuilderPrice
  window.product.kit_builder.badge.price = 0;

  // Deselect all badge buttons as they will be out of sync with the cart price
  // when changing personalisation type
  const badgeBtns = document.querySelectorAll(".kit-badge > input");
  badgeBtns.forEach((btn) => {
    if (btn.value === "none") {
      // Select none by default
      btn.checked = true;
    } else {
      btn.checked = false;
    }
  });

  const badgeInput = document.querySelector('input[name="properties[Badge]"]');
  const badgePriceInput = document.querySelector(
    'input[name="properties[_badgePrice]"]'
  );
  // Setting to empty string hides in cart
  if (badgeInput) badgeInput.value = "";
  if (badgePriceInput) badgePriceInput.value = "";
}

function updatePlayerProperties(playerSelect) {
  if (playerSelect) {
    const playerID = playerSelect.value;
    const player = window.product?.kit_builder?.players?.find(
      (obj) => obj.id === playerID
    );
    if (player) {
      const nameInput = document.querySelector(
        'input[name="properties[Name]"]'
      );
      const numberInput = document.querySelector(
        'input[name="properties[Number]"]'
      );
      if (nameInput) nameInput.value = player.name.toUpperCase();
      if (numberInput) numberInput.value = player.number;
    }
  }
}

function updateKitBuilderPrice() {
  let price = parseFloat(window.product?.price);
  if (isNaN(price)) {
    return;
  }
  // product-buy-price is the tag with the price on the add to cart button
  let productPrice = document.getElementById("product-buy-price");
  let personalisedPrice = document.querySelector(
    "input[name='properties[_personalisePrice]']"
  );
  if (!productPrice || !personalisedPrice) {
    return;
  }

  const personalisedType =
    document.querySelector('input[name="properties[Personalised]"]').value ??
    "None";
  if (personalisedType != "None" && personalisedPrice) {
    const personalisedPriceValue = parseFloat(personalisedPrice.value);
    if (!isNaN(personalisedPriceValue)) {
      price += personalisedPriceValue;
    }
  }

  const badgePrice = parseFloat(window.product?.kit_builder?.badge?.price);
  if (!isNaN(badgePrice)) {
    price += badgePrice;
  }

  const formattedPrice = (window?.product?.currency ?? "£") + price.toFixed(2);

  // Update main product price
  productPrice.textContent = formattedPrice;

  // Update sticky form price if it exists (this shows when scrolling down on product page)
  let productPriceSticky = document.querySelector(
    "product-sticky-form #product-price"
  );
  if (productPriceSticky) {
    productPriceSticky.textContent = formattedPrice;
  }
}

function limitString(str, limit) {
  if (str.length <= limit) {
    return str; // If the string is already within the limit, return it as is
  } else {
    return str.substring(0, limit); // Extract a substring from index 0 to the specified limit
  }
}

// Kit Builder Form Validation
function validateKitBuilderInputs() {
  let isValid = true;

  // Get form inputs
  const nameInput = document.querySelector('input[name="properties[Name]"]');
  const numberInput = document.querySelector(
    'input[name="properties[Number]"]'
  );
  const nameError = document.getElementById("name-error");
  const numberError = document.getElementById("number-error");

  // Clear previous errors
  clearFieldError(nameInput, nameError);
  clearFieldError(numberInput, numberError);

  // Validate name field (required when custom is selected)
  if (
    nameInput &&
    nameInput.closest(".kit_builder__custom").style.display !== "none"
  ) {
    const nameValue = nameInput.value.trim();
    if (!nameValue) {
      showFieldError(nameInput, nameError, "Name is required");
      isValid = false;
    } else if (
      nameValue.length > (window.product?.kit_builder?.character_limit || 14)
    ) {
      showFieldError(
        nameInput,
        nameError,
        `Name cannot exceed ${
          window.product?.kit_builder?.character_limit || 14
        } characters`
      );
      isValid = false;
    }
  }

  // Validate number field (optional but must be valid range)
  if (
    numberInput &&
    numberInput.closest(".kit_builder__custom").style.display !== "none"
  ) {
    const numberValue = numberInput.value;
    if (numberValue === undefined || numberValue === null) {
      showFieldError(numberInput, numberError, "Number is required");
      isValid = false;
    } else if (numberValue < 0 || numberValue > 99) {
      showFieldError(
        numberInput,
        numberError,
        "Number must be between 0 and 99"
      );
      isValid = false;
    }
  }

  return isValid;
}
