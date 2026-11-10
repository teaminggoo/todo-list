// 로컬스토리지 저장 키
const STORAGE_KEY = "simple_todo_list_data";
const THEME_KEY = "simple_todo_theme";

// DOM 요소 참조
const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const dueDateInput = document.getElementById("todo-due-date");
const searchInput = document.getElementById("search-input");
const todoList = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");
const emptyMessage = document.getElementById("empty-message");
const taskCount = document.getElementById("task-count");
const clearCompletedBtn = document.getElementById("clear-completed-btn");
const tabButtons = document.querySelectorAll(".tab-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

// 상태 관리
let todos = [];
let currentFilter = "all"; // 'all' | 'active' | 'completed' | 'important'
let searchKeyword = "";
let editingId = null; // 현재 수정 중인 todo의 id

// ========================
// 테마(다크 모드) 관리
// ========================
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

  applyTheme(initialTheme);
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggleBtn.textContent = "☀️";
    themeToggleBtn.title = "라이트 모드로 전환";
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeToggleBtn.textContent = "🌙";
    themeToggleBtn.title = "다크 모드로 전환";
  }
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(isDark ? "light" : "dark");
}

// ========================
// 로컬스토리지 데이터 관리
// ========================
function loadTodos() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      todos = JSON.parse(rawData);
    }
  } catch (error) {
    console.error("데이터를 불러오는 중 오류가 발생했습니다:", error);
    todos = [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error("데이터를 저장하는 중 오류가 발생했습니다:", error);
  }
}

// ========================
// 유틸: 마감일 D-Day 계산
// ========================
function getDueDateBadgeInfo(dueDateStr) {
  if (!dueDateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `기한초과 (${Math.abs(diffDays)}일 전)`, className: "badge-overdue" };
  } else if (diffDays === 0) {
    return { text: "오늘 마감", className: "badge-today" };
  } else {
    return { text: `D-${diffDays}`, className: "badge-upcoming" };
  }
}

// ========================
// 필터 및 렌더링 로직
// ========================
function getFilteredTodos() {
  return todos
    .filter((todo) => {
      // 1. 탭 필터
      if (currentFilter === "active") return !todo.completed;
      if (currentFilter === "completed") return todo.completed;
      if (currentFilter === "important") return todo.important;
      return true;
    })
    .filter((todo) => {
      // 2. 검색 키워드 필터
      if (!searchKeyword.trim()) return true;
      return todo.text.toLowerCase().includes(searchKeyword.trim().toLowerCase());
    })
    .sort((a, b) => {
      // 중요 표시된 항목 우선 정렬 (완료된 항목은 뒤로)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (a.important !== b.important) {
        return a.important ? -1 : 1;
      }
      return 0;
    });
}

function renderTodos() {
  todoList.innerHTML = "";

  const filteredTodos = getFilteredTodos();
  const completedCount = todos.filter((todo) => todo.completed).length;

  // 요약 카운트 업데이트
  taskCount.textContent = `총 ${todos.length}개 중 ${completedCount}개 완료`;

  // 완료된 항목 삭제 버튼 표시/숨김
  if (completedCount > 0) {
    clearCompletedBtn.classList.remove("hidden");
  } else {
    clearCompletedBtn.classList.add("hidden");
  }

  // 빈 목록 상태 처리
  if (filteredTodos.length === 0) {
    emptyState.style.display = "block";
    if (searchKeyword.trim()) {
      emptyMessage.textContent = `"${searchKeyword}" 검색 결과가 없습니다 🔍`;
    } else if (currentFilter === "active" && todos.length > 0) {
      emptyMessage.textContent = "진행 중인 할 일이 없습니다! 모두 완료하셨네요 🎉";
    } else if (currentFilter === "completed" && todos.length > 0) {
      emptyMessage.textContent = "완료된 할 일이 아직 없습니다 💪";
    } else if (currentFilter === "important" && todos.length > 0) {
      emptyMessage.textContent = "중요 표시된 할 일이 없습니다 ⭐";
    } else {
      emptyMessage.textContent = "등록된 할 일이 없습니다 ✨";
    }
  } else {
    emptyState.style.display = "none";
  }

  // 할 일 목록 아이템 생성
  filteredTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item ${todo.completed ? "completed" : ""} ${
      todo.important ? "is-important" : ""
    }`;

    const isEditing = editingId === todo.id;

    if (isEditing) {
      // 수정 모드 렌더링
      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.className = "todo-edit-input";
      editInput.value = todo.text;

      editInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          finishEditing(todo.id, editInput.value);
        } else if (e.key === "Escape") {
          cancelEditing();
        }
      });

      editInput.addEventListener("blur", () => {
        finishEditing(todo.id, editInput.value);
      });

      li.appendChild(editInput);

      setTimeout(() => {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      }, 0);
    } else {
      // 일반 모드 렌더링
      const leftDiv = document.createElement("div");
      leftDiv.className = "todo-item-left";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "todo-checkbox";
      checkbox.checked = todo.completed;
      checkbox.addEventListener("change", () => toggleTodo(todo.id));

      const contentDiv = document.createElement("div");
      contentDiv.className = "todo-content";

      const span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = todo.text;
      span.title = "더블 클릭하여 수정할 수 있습니다";
      span.addEventListener("click", () => toggleTodo(todo.id));
      span.addEventListener("dblclick", () => startEditing(todo.id));
      contentDiv.appendChild(span);

      // 마감일 뱃지
      if (todo.dueDate) {
        const badgeInfo = getDueDateBadgeInfo(todo.dueDate);
        if (badgeInfo) {
          const badge = document.createElement("span");
          badge.className = `due-badge ${badgeInfo.className}`;
          badge.textContent = `📅 ${badgeInfo.text}`;
          contentDiv.appendChild(badge);
        }
      }

      leftDiv.appendChild(checkbox);
      leftDiv.appendChild(contentDiv);

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "todo-actions";

      // 중요 표시 버튼
      const starBtn = document.createElement("button");
      starBtn.className = `btn-action btn-star ${todo.important ? "active" : ""}`;
      starBtn.type = "button";
      starBtn.title = todo.important ? "중요 해제" : "중요 표시";
      starBtn.setAttribute("aria-label", "중요 표시");
      starBtn.textContent = todo.important ? "⭐" : "☆";
      starBtn.addEventListener("click", () => toggleImportant(todo.id));

      // 수정 버튼
      const editBtn = document.createElement("button");
      editBtn.className = "btn-action btn-edit";
      editBtn.type = "button";
      editBtn.title = "수정";
      editBtn.setAttribute("aria-label", "수정");
      editBtn.textContent = "✏️";
      editBtn.addEventListener("click", () => startEditing(todo.id));

      // 삭제 버튼
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-action btn-delete";
      deleteBtn.type = "button";
      deleteBtn.title = "삭제";
      deleteBtn.setAttribute("aria-label", "삭제");
      deleteBtn.textContent = "✕";
      deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

      actionsDiv.appendChild(starBtn);
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(leftDiv);
      li.appendChild(actionsDiv);
    }

    todoList.appendChild(li);
  });
}

// ========================
// 할 일 데이터 조작 함수
// ========================
function addTodo(text, dueDate) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const newTodo = {
    id: Date.now(),
    text: trimmed,
    completed: false,
    important: false,
    dueDate: dueDate || null,
    createdAt: new Date().toISOString(),
  };

  todos.unshift(newTodo);
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  saveTodos();
  renderTodos();
}

function toggleImportant(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, important: !todo.important } : todo
  );
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  if (editingId === id) editingId = null;
  saveTodos();
  renderTodos();
}

function clearCompleted() {
  if (confirm("완료된 항목을 모두 삭제하시겠습니까?")) {
    todos = todos.filter((todo) => !todo.completed);
    saveTodos();
    renderTodos();
  }
}

// 수정 관련 함수
function startEditing(id) {
  editingId = id;
  renderTodos();
}

function finishEditing(id, newText) {
  const trimmed = newText.trim();
  if (trimmed) {
    todos = todos.map((todo) =>
      todo.id === id ? { ...todo, text: trimmed } : todo
    );
    saveTodos();
  } else {
    deleteTodo(id);
  }
  editingId = null;
  renderTodos();
}

function cancelEditing() {
  editingId = null;
  renderTodos();
}

// 필터 및 검색 처리
function handleFilterChange(filter) {
  currentFilter = filter;
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderTodos();
}

// ========================
// 이벤트 리스너 등록
// ========================
todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo(todoInput.value, dueDateInput.value);
  todoInput.value = "";
  dueDateInput.value = "";
  todoInput.focus();
});

searchInput.addEventListener("input", (e) => {
  searchKeyword = e.target.value;
  renderTodos();
});

clearCompletedBtn.addEventListener("click", clearCompleted);

themeToggleBtn.addEventListener("click", toggleTheme);

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    handleFilterChange(btn.dataset.filter);
  });
});

// ========================
// 초기화
// ========================
initTheme();
loadTodos();
renderTodos();
