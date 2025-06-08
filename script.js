const projectName = "card-manager";
const itemContainer = document.querySelector(".item-container");
const searchBox = document.querySelector(".search-box");
const breadcrumbs = document.querySelector(".breadcrumbs");
const editModeBtn = document.querySelector(".edit-mode");

const defaultIcon = "icon-default.png";
const rootFolder = { id: null, name: "Root", path: [] };
let currentItems = JSON.parse(localStorage.getItem(`${projectName}_items`)) || [];
let currentFolder = rootFolder;
let editMode = false;

let darkTheme = JSON.parse(localStorage.getItem(`${projectName}_darkTheme`)) || false;

document.addEventListener("DOMContentLoaded", function () {
  displayItems();
  editModeBtn.classList.toggle("active", editMode);
  displayBreadcrumbs();
  toggleTheme(darkTheme);
});

window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`;
  console.error(error);
  alert(error);
});

function stopPropagation(event) {
  event.stopPropagation();
}

function getFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function getItem(itemId) {
  return currentItems.find((item) => item.id === itemId);
}

function createItem(item) {
  if (!item.name) return;

  currentItems.push(item);
  localStorage.setItem(`${projectName}_items`, JSON.stringify(currentItems));

  displayItems();
  ItemModal.toggle();
  Toast.show("Item has been successfully added");
}

function updateItem(index, updates) {
  if (!updates.name) return;

  let item = currentItems[index];

  const updatedItem = { ...item, ...updates };
  currentItems[index] = updatedItem;

  localStorage.setItem(`${projectName}_items`, JSON.stringify(currentItems));
  displayItems();
  Toast.show("Item has been successfully updated");
}

function deleteItem(index) {
  currentItems.splice(index, 1);
  localStorage.setItem(`${projectName}_items`, JSON.stringify(currentItems));
  displayItems();
  Toast.show("Item has been successfully deleted");
}

function displayItems(items) {
  if (!items) items = currentItems.filter((item) => item.parentId === currentFolder.id);
  itemContainer.innerHTML =
    items
      .map(
        (item) =>
          `
      <div class="item ${item.type}" onclick="handleItem('${item.id}')">
        <img src="${item.icon || defaultIcon}">
        <p class="item-text truncated">${item.name}</p>
      </div>
    `
      )
      .join("") || "No items found";
}

function handleItem(itemId) {
  const item = getItem(itemId);
  if (editMode) {
    ItemModal.toggle(item.id);
  } else {
    item.type === "card" ? DetailsModal.toggle(item.id) : openFolder(item.id);
  }
}

function openFolder(ref) {
  if (Number.isFinite(ref)) {
    currentFolder = currentItems[ref];
  } else if (typeof ref === "string") {
    currentFolder = currentItems.filter((item) => item.id === ref)[0];
  }
  if (!currentFolder) currentFolder = rootFolder;
  displayItems();
  displayBreadcrumbs();
}

const ItemModal = (() => {
  const element = document.querySelector(".item-modal");
  const title = element.querySelector(".title");
  const nameInput = element.querySelector(".name-input");
  const descriptionInput = element.querySelector(".description-input");
  const iconInput = element.querySelector(".icon-input");
  const iconFileInput = iconInput.querySelector("input[type=file]");
  const submitBtn = element.querySelector(".submit");
  const deleteBtn = element.querySelector(".delete");
  let currentItemType = "card";

  iconFileInput.oninput = (event) => {
    const file = event.target.files[0];

    if (!isFileSizeAllowed(file)) {
      Toast.show("That file is too large. Please select a file smaller than 5MB.");
      event.target.value = "";
      return;
    }

    iconInput.style.backgroundImage = file ? `url(${URL.createObjectURL(file)})` : null;
  };

  async function getItemData(item = {}) {
    const itemData = {
      id: item.id || crypto.randomUUID(),
      name: nameInput.value || item.name,
      type: item.type || currentItemType,
      parentId: item.parentId || currentFolder.id,
      path: item.path || [...currentFolder.path, { id: currentFolder.id, name: currentFolder.name }],
      description: descriptionInput.value || item.description,
      icon: iconFileInput.value ? await getFileContent(iconFileInput.files[0]) : item.icon || null,
    };
    return itemData;
  }

  function toggle(itemId, itemType) {
    const item = getItem(itemId);
    currentItemType = itemType || (item ? item.type : "card");
    iconFileInput.value = "";
    title.textContent = `Create a new ${currentItemType}`;
    submitBtn.textContent = "Create";
    submitBtn.onclick = async () => createItem(await getItemData());
    deleteBtn.classList.toggle("hidden", true);
    iconInput.style.backgroundImage = null;
    nameInput.value = "";
    descriptionInput.value = "";

    if (item) {
      title.textContent = `Update ${item.name}`;
      submitBtn.textContent = "Update";
      deleteBtn.classList.toggle("hidden", false);
      const itemIndex = currentItems.indexOf(item);
      submitBtn.onclick = async () => {
        updateItem(itemIndex, await getItemData(item));
        toggle();
      };
      deleteBtn.onclick = () => {
        deleteItem(itemIndex);
        toggle();
      };

      iconInput.style.backgroundImage = `url(${item.icon || defaultIcon})`;

      nameInput.value = item.name || "";
      descriptionInput.value = item.description || "";
    }
    element.classList.toggle("hidden");
  }

  return { toggle };
})();

const DetailsModal = (() => {
  const element = document.querySelector(".details-modal");
  const imageEl = element.querySelector(".image");
  const nameEl = element.querySelector(".name");
  const descriptionEl = element.querySelector(".description");

  function toggle(itemId) {
    const item = getItem(itemId);
    element.classList.toggle("hidden");
    imageEl.src = "";
    nameEl.textContent = "Item name";
    descriptionEl.textContent = "Item description";

    if (item) {
      imageEl.src = item.icon;
      nameEl.textContent = item.name;
      descriptionEl.textContent = item.description;
    }
  }

  return { toggle };
})();

function toggleTheme(force = undefined) {
  const toggle = document.querySelector(".theme-toggle");
  force === undefined ? (darkTheme = !darkTheme) : (darkTheme = force);
  localStorage.setItem(`${projectName}_darkTheme`, darkTheme);
  document.body.classList.toggle("dark-theme", darkTheme);
  toggle.innerHTML = darkTheme ? `<i class="bi bi-sun"></i>` : `<i class="bi bi-moon"></i>`;
}

const Toast = (() => {
  const container = document.querySelector(".toast-container");
  let currentItems = [];

  function show(message) {
    if (!message) return;
    const item = crypto.randomUUID();
    currentItems.push(item);
    container.innerHTML += `
      <div class="toast" data-toast="${item}">
        ${message}
      </div>
    `;
    container.classList.remove("hidden");

    setTimeout(() => {
      const itemEl = container.querySelector(`[data-toast="${item}"]`);
      itemEl.remove();
      const itemToFilter = item;
      currentItems = currentItems.filter((item) => item !== itemToFilter);
      if (currentItems.length <= 0) container.classList.add("hidden");
    }, 3000);
  }

  return { show };
})();

function search(terms) {
  const items = currentItems.filter((item) => item.parentId === currentFolder.id);
  const query = terms.trim().toLowerCase();
  const filteredItems = query ? items.filter((item) => item.name.toLowerCase().includes(query)) : null;
  displayItems(filteredItems);
}

function toggleEditMode() {
  editMode = !editMode;
  editModeBtn.classList.toggle("active", editMode);
}

function displayBreadcrumbs() {
  breadcrumbs.innerHTML = "";
  breadcrumbs.innerHTML += currentFolder.path
    .map(
      (route) => `
            <button onclick="openFolder('${route.id}')">${route.name}</button> /
          `
    )
    .join("");
  breadcrumbs.innerHTML += `<button>${currentFolder.name}</button>`;
  breadcrumbs.scrollLeft = breadcrumbs.scrollWidth;
}

function exportItems() {
  const dataStr = JSON.stringify(currentItems, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "items.json";
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function importItems() {
  const input = document.querySelector(".header .import input");
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedItems = JSON.parse(e.target.result);
      console.log("Imported:", importedItems);
      // Now you can update your UI or store them
      currentItems = importedItems;
      localStorage.setItem(`${projectName}_items`, JSON.stringify(currentItems));
      displayItems();
    } catch (err) {
      alert("Invalid JSON file");
    }
  };
  reader.readAsText(file);
}

function isFileSizeAllowed(file) {
  const maxSize = 5 * 1024 * 1024; // 5 MB in bytes

  return file.size > maxSize ? false : true;
}
