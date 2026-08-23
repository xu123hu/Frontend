<template>
  <div class="rs-page rs-project-page">
    <!-- 加载态 -->
    <div v-if="loading" class="rs-project-loading">
      <div class="rs-loading-spinner"></div>
      <p>加载项目数据中...</p>
    </div>

    <template v-else>
      <!-- 1. 项目头部 -->
      <div class="rs-project-header">
        <div class="rs-project-header-left">
          <div class="rs-project-symbol lg purple">
            {{ project?.name?.charAt(0) || 'G' }}
          </div>
          <div class="rs-project-head-info">
            <h1>{{ project?.name || 'GNN 路径规划优化研究' }}</h1>
            <div class="rs-project-tags">
              <span
                v-for="tag in displayTags"
                :key="tag"
                class="rs-tag rs-tag-brand"
              >
                {{ tag }}
              </span>
            </div>
            <p class="rs-project-desc">{{ project?.description }}</p>
          </div>
        </div>
        <div class="rs-project-header-right">
          <div class="rs-project-stats">
            <div class="rs-project-stat">
              <div class="rs-project-stat-value">{{ members.length }}</div>
              <div class="rs-project-stat-label">成员</div>
            </div>
            <div class="rs-project-stat">
              <div class="rs-project-stat-value">{{ tasks.length }}</div>
              <div class="rs-project-stat-label">任务</div>
            </div>
            <div class="rs-project-stat">
              <div class="rs-project-stat-value">{{ evidence.length }}</div>
              <div class="rs-project-stat-label">证据</div>
            </div>
          </div>
          <div class="rs-project-actions">
            <button class="rs-btn rs-btn-secondary rs-btn-md" @click="onInviteMember">
              <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              邀请成员
            </button>
            <button class="rs-btn rs-btn-secondary rs-btn-md" @click="onProjectSettings">
              <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              项目设置
            </button>
            <button class="rs-btn rs-btn-primary rs-btn-md" @click="onNewTask">
              <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              新建任务
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Tab 标签页 -->
      <div class="rs-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="rs-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </div>
      </div>

      <!-- 3. Tab 内容区 -->
      <div class="rs-tab-content">
        <!-- Tab 1：概览 -->
        <div v-show="activeTab === 'overview'" class="rs-tab-pane active">
          <!-- 双栏布局 -->
          <div class="rs-g2">
            <!-- 左栏 -->
            <div class="rs-g2-col">
              <!-- 核心研究问题 -->
              <div class="rs-panel rs-mb-4">
                <div class="rs-panel-header">
                  <div class="rs-panel-title">核心研究问题</div>
                </div>
                <div class="rs-panel-body">
                  <p class="rs-research-question">
                    {{ project?.researchQuestion || '注意力增强的 GNN 模型能否在动态路网中显著提升路径规划效率与准确性？' }}
                  </p>
                  <div class="rs-divider"></div>
                  <div class="rs-hypotheses">
                    <div class="rs-hypothesis-title">研究假设</div>
                    <div
                      v-for="(h, idx) in displayHypotheses"
                      :key="idx"
                      class="rs-hypothesis-item"
                    >
                      <div class="rs-hypothesis-check" :class="{ verified: idx < 2 }">
                        <svg v-if="idx < 2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="9"/>
                          <path d="M12 8v4"/>
                          <path d="M12 16h.01"/>
                        </svg>
                      </div>
                      <div class="rs-hypothesis-text">
                        {{ h }}
                      </div>
                      <div class="rs-hypothesis-status">
                        <span v-if="idx < 2" class="rs-tag rs-tag-success rs-tag-dot">已验证</span>
                        <span v-else class="rs-tag rs-tag-warning rs-tag-dot">待验证</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 项目成员 -->
              <div class="rs-panel">
                <div class="rs-panel-header">
                  <div class="rs-panel-title">项目成员</div>
                  <button class="rs-btn rs-btn-ghost rs-btn-sm" @click="onManageMembers">
                    管理 →
                  </button>
                </div>
                <div class="rs-panel-body rs-p-0">
                  <div
                    v-for="member in members"
                    :key="member.id"
                    class="rs-member-row"
                  >
                    <div class="rs-member-avatar" :class="memberColor(member.id)">
                      {{ member.name.charAt(0) }}
                    </div>
                    <div class="rs-member-info">
                      <div class="rs-member-name">{{ member.name }}</div>
                      <div class="rs-member-role">{{ member.role }}</div>
                    </div>
                    <div class="rs-member-status">
                      <span class="rs-status-dot" :class="{ online: isOnline(member.id) }"></span>
                      <span class="rs-status-text">{{ isOnline(member.id) ? '在线' : '离线' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右栏 -->
            <div class="rs-g2-col">
              <!-- 项目概览统计 -->
              <div class="rs-panel rs-mb-4">
                <div class="rs-panel-header">
                  <div class="rs-panel-title">项目概览</div>
                </div>
                <div class="rs-panel-body">
                  <div class="rs-stats-grid">
                    <div class="rs-stat-card">
                      <div class="rs-stat-card-label">进度</div>
                      <div class="rs-stat-card-value">{{ project?.progress ?? 72 }}%</div>
                      <div class="rs-progress-bar rs-mt-2">
                        <div class="rs-progress-bar-fill" :style="{ width: (project?.progress ?? 72) + '%' }"></div>
                      </div>
                    </div>
                    <div class="rs-stat-card">
                      <div class="rs-stat-card-label">已完成任务</div>
                      <div class="rs-stat-card-value">
                        {{ completedTasksCount }}<span class="rs-stat-card-total">/{{ tasks.length }}</span>
                      </div>
                    </div>
                    <div class="rs-stat-card">
                      <div class="rs-stat-card-label">已验证证据</div>
                      <div class="rs-stat-card-value">
                        {{ verifiedEvidenceCount }}<span class="rs-stat-card-total">/{{ evidence.length }}</span>
                      </div>
                    </div>
                    <div class="rs-stat-card">
                      <div class="rs-stat-card-label">本周运行</div>
                      <div class="rs-stat-card-value">{{ weeklyRunsCount }}<span class="rs-stat-card-unit"> 次</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 最近活动 -->
              <div class="rs-panel">
                <div class="rs-panel-header">
                  <div class="rs-panel-title">最近活动</div>
                  <button class="rs-btn rs-btn-ghost rs-btn-sm" @click="activeTab = 'activity'">
                    查看全部 →
                  </button>
                </div>
                <div class="rs-panel-body">
                  <div class="rs-timeline">
                    <div
                      v-for="item in activities.slice(0, 5)"
                      :key="item.id"
                      class="rs-timeline-item"
                      :class="activityClass(item.type)"
                    >
                      <div class="rs-timeline-dot"></div>
                      <div class="rs-timeline-content">
                        <div class="rs-timeline-time">{{ formatTime(item.time) }}</div>
                        <div class="rs-timeline-title">{{ item.title }}</div>
                        <div class="rs-timeline-desc">{{ item.description }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部全宽：任务看板 -->
          <div class="rs-panel rs-mt-4">
            <div class="rs-panel-header">
              <div class="rs-panel-title">任务看板</div>
              <button class="rs-btn rs-btn-ghost rs-btn-sm" @click="activeTab = 'tasks'">
                全部任务 →
              </button>
            </div>
            <div class="rs-panel-body">
              <div class="rs-kanban">
                <div v-for="col in kanbanColumns" :key="col.key" class="rs-kanban-col">
                  <div class="rs-kanban-col-header">
                    <div class="rs-kanban-col-dot" :class="col.key"></div>
                    <div class="rs-kanban-col-title">{{ col.label }}</div>
                    <div class="rs-kanban-col-count">{{ getTasksByStatus(col.key).length }}</div>
                    <div class="rs-kanban-col-add" @click="onNewTask">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                  </div>
                  <div class="rs-kanban-col-body">
                    <div
                      v-for="task in getTasksByStatus(col.key)"
                      :key="task.id"
                      class="rs-kanban-card"
                      @click="onTaskClick(task)"
                    >
                      <div class="rs-kanban-card-drag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="9" cy="5" r="1"/>
                          <circle cx="9" cy="12" r="1"/>
                          <circle cx="9" cy="19" r="1"/>
                          <circle cx="15" cy="5" r="1"/>
                          <circle cx="15" cy="12" r="1"/>
                          <circle cx="15" cy="19" r="1"/>
                        </svg>
                      </div>
                      <div class="rs-kanban-card-title">{{ task.title }}</div>
                      <div class="rs-kanban-card-tags">
                        <span class="rs-tag" :class="priorityTagClass(task.priority)">
                          {{ priorityText(task.priority) }}
                        </span>
                        <span class="rs-tag rs-tag-info">研究任务</span>
                      </div>
                      <div class="rs-kanban-card-footer">
                        <div class="rs-kanban-card-assignee">
                          <div class="rs-kanban-card-avatar">
                            {{ task.assignee?.charAt(0) || '?' }}
                          </div>
                          <span class="rs-kanban-card-assignee-name">{{ task.assignee || '未分配' }}</span>
                        </div>
                        <div class="rs-kanban-card-date">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span>周五</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2：任务 -->
        <div v-show="activeTab === 'tasks'" class="rs-tab-pane">
          <div class="rs-panel">
            <div class="rs-panel-header">
              <div class="rs-panel-title">任务看板</div>
              <div class="rs-panel-actions">
                <button class="rs-btn rs-btn-secondary rs-btn-sm" @click="onNewTask">
                  <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  新建任务
                </button>
              </div>
            </div>
            <div class="rs-panel-body">
              <div class="rs-kanban">
                <div v-for="col in kanbanColumns" :key="col.key" class="rs-kanban-col">
                  <div class="rs-kanban-col-header">
                    <div class="rs-kanban-col-dot" :class="col.key"></div>
                    <div class="rs-kanban-col-title">{{ col.label }}</div>
                    <div class="rs-kanban-col-count">{{ getTasksByStatus(col.key).length }}</div>
                    <div class="rs-kanban-col-add" @click="onNewTask">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                  </div>
                  <div class="rs-kanban-col-body">
                    <div
                      v-for="task in getTasksByStatus(col.key)"
                      :key="task.id"
                      class="rs-kanban-card"
                      @click="onTaskClick(task)"
                    >
                      <div class="rs-kanban-card-drag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="9" cy="5" r="1"/>
                          <circle cx="9" cy="12" r="1"/>
                          <circle cx="9" cy="19" r="1"/>
                          <circle cx="15" cy="5" r="1"/>
                          <circle cx="15" cy="12" r="1"/>
                          <circle cx="15" cy="19" r="1"/>
                        </svg>
                      </div>
                      <div class="rs-kanban-card-title">{{ task.title }}</div>
                      <div class="rs-kanban-card-tags">
                        <span class="rs-tag" :class="priorityTagClass(task.priority)">
                          {{ priorityText(task.priority) }}
                        </span>
                        <span class="rs-tag rs-tag-info">研究任务</span>
                      </div>
                      <div class="rs-kanban-card-footer">
                        <div class="rs-kanban-card-assignee">
                          <div class="rs-kanban-card-avatar">
                            {{ task.assignee?.charAt(0) || '?' }}
                          </div>
                          <span class="rs-kanban-card-assignee-name">{{ task.assignee || '未分配' }}</span>
                        </div>
                        <div class="rs-kanban-card-date">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span>周五</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3：资产 -->
        <div v-show="activeTab === 'assets'" class="rs-tab-pane">
          <div class="rs-panel">
            <div class="rs-panel-header">
              <div class="rs-panel-title">项目资产</div>
              <div class="rs-panel-actions">
                <button class="rs-btn rs-btn-secondary rs-btn-sm">
                  <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  上传文件
                </button>
              </div>
            </div>
            <div class="rs-panel-body">
              <div class="rs-asset-filters">
                <button
                  v-for="f in assetFilters"
                  :key="f.key"
                  class="rs-chip"
                  :class="{ active: activeAssetFilter === f.key }"
                  @click="activeAssetFilter = f.key"
                >
                  {{ f.label }}
                </button>
              </div>
              <div class="rs-asset-grid">
                <div
                  v-for="asset in filteredAssets"
                  :key="asset.id"
                  class="rs-asset-card"
                  @click="onAssetClick(asset)"
                >
                  <div class="rs-asset-icon" :class="asset.type">
                    <svg v-if="asset.type === 'doc'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <svg v-else-if="asset.type === 'code'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="16 18 22 12 16 6"/>
                      <polyline points="8 6 2 12 8 18"/>
                    </svg>
                    <svg v-else-if="asset.type === 'data'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/>
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div class="rs-asset-info">
                    <div class="rs-asset-name">{{ asset.name }}</div>
                    <div class="rs-asset-meta">
                      <span>{{ asset.size }}</span>
                      <span>·</span>
                      <span>{{ formatTime(asset.updatedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 4：证据账本 -->
        <div v-show="activeTab === 'evidence'" class="rs-tab-pane">
          <div class="rs-panel">
            <div class="rs-panel-header">
              <div class="rs-panel-title">证据账本</div>
              <div class="rs-panel-actions">
                <button class="rs-btn rs-btn-secondary rs-btn-sm">
                  <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  新建验证
                </button>
              </div>
            </div>
            <div class="rs-panel-body">
              <div class="rs-evidence-filters">
                <button
                  v-for="f in evidenceFilters"
                  :key="f.key"
                  class="rs-chip"
                  :class="{ active: activeEvidenceFilter === f.key }"
                  @click="activeEvidenceFilter = f.key"
                >
                  {{ f.label }}
                </button>
              </div>
              <div class="rs-evidence-list-full">
                <div
                  v-for="item in filteredEvidence"
                  :key="item.id"
                  class="rs-evidence-item-full"
                  @click="onEvidenceClick(item)"
                >
                  <div class="rs-evidence-item-type-tag" :class="item.type">
                    {{ evidenceTypeText(item.type) }}
                  </div>
                  <div class="rs-evidence-item-title-full">{{ item.title }}</div>
                  <div class="rs-evidence-item-meta-full">
                    <span class="rs-evidence-source">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                      {{ item.source }}
                    </span>
                    <span class="rs-evidence-time">{{ formatTime(item.createdAt) }}</span>
                    <span class="rs-evidence-status-badge" :class="item.status">
                      {{ evidenceStatusText(item.status) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 5：运行 -->
        <div v-show="activeTab === 'runs'" class="rs-tab-pane">
          <div class="rs-panel">
            <div class="rs-panel-header">
              <div class="rs-panel-title">项目运行</div>
              <div class="rs-panel-actions">
                <button class="rs-btn rs-btn-secondary rs-btn-sm">
                  <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  新建运行
                </button>
              </div>
            </div>
            <div class="rs-run-list">
              <div class="rs-run-row rs-run-row-header">
                <div></div>
                <div>运行名称</div>
                <div>类型</div>
                <div>时长</div>
                <div>状态</div>
                <div>操作</div>
              </div>
              <div
                v-for="run in projectRuns"
                :key="run.id"
                class="rs-run-row"
                @click="onRunClick(run)"
              >
                <div class="rs-run-status" :class="run.status"></div>
                <div class="rs-run-name">
                  <div class="rs-run-title">{{ run.title }}</div>
                  <div class="rs-run-sub">{{ run.mode }} · {{ formatTime(run.startedAt) }}</div>
                </div>
                <div class="rs-run-cell">{{ runTypeText(run.type) }}</div>
                <div class="rs-run-duration">{{ formatDuration(run.duration) }}</div>
                <div class="rs-run-cell">
                  <span class="rs-tag" :class="runStatusTagClass(run.status)">
                    {{ runStatusText(run.status) }}
                  </span>
                </div>
                <div class="rs-run-cell muted">
                  <button class="rs-btn rs-btn-ghost rs-btn-sm">详情</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 6：动态 -->
        <div v-show="activeTab === 'activity'" class="rs-tab-pane">
          <div class="rs-panel">
            <div class="rs-panel-header">
              <div class="rs-panel-title">项目动态</div>
            </div>
            <div class="rs-panel-body">
              <div v-for="(group, date) in activityByDay" :key="date" class="rs-activity-day-group">
                <div class="rs-activity-day-label">{{ date }}</div>
                <div class="rs-timeline">
                  <div
                    v-for="item in group"
                    :key="item.id"
                    class="rs-timeline-item"
                    :class="activityClass(item.type)"
                  >
                    <div class="rs-timeline-dot"></div>
                    <div class="rs-timeline-content">
                      <div class="rs-timeline-time">{{ formatTimeOfDay(item.time) }}</div>
                      <div class="rs-timeline-title">{{ item.title }}</div>
                      <div class="rs-timeline-desc">{{ item.description }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { researchProjectApi, researchRunsApi } from '@/api/research'
import type {
  ResearchProject,
  ProjectMember,
  ProjectTask,
  EvidenceItem,
  ActivityItem,
  ResearchRun,
} from '@/types/research'

const route = useRoute()
const toastStore = useToastStore()

// 状态
const activeTab = ref('overview')
const project = ref<ResearchProject | null>(null)
const members = ref<ProjectMember[]>([])
const tasks = ref<ProjectTask[]>([])
const evidence = ref<EvidenceItem[]>([])
const activities = ref<ActivityItem[]>([])
const projectRuns = ref<ResearchRun[]>([])
const loading = ref(false)
const activeAssetFilter = ref('all')
const activeEvidenceFilter = ref('all')

// Tab 配置
const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'tasks', label: '任务' },
  { key: 'assets', label: '资产' },
  { key: 'evidence', label: '证据账本' },
  { key: 'runs', label: '运行' },
  { key: 'activity', label: '动态' },
]

// 看板列配置
const kanbanColumns = [
  { key: 'todo', label: '待办' },
  { key: 'in_progress', label: '进行中' },
  { key: 'review', label: '审核中' },
  { key: 'done', label: '已完成' },
]

// 资产筛选
const assetFilters = [
  { key: 'all', label: '全部' },
  { key: 'doc', label: '文档' },
  { key: 'code', label: '代码' },
  { key: 'data', label: '数据' },
  { key: 'image', label: '图片' },
]

// 证据筛选
const evidenceFilters = [
  { key: 'all', label: '全部' },
  { key: 'verified', label: '已验证' },
  { key: 'pending', label: '待验证' },
  { key: 'rejected', label: '已驳回' },
]

// 模拟资产数据
const mockAssets = [
  { id: 'a1', name: '研究方案初稿.docx', type: 'doc', size: '2.3 MB', updatedAt: '2024-08-15T10:30:00Z' },
  { id: 'a2', name: 'gnn_model.py', type: 'code', size: '45 KB', updatedAt: '2024-08-18T14:20:00Z' },
  { id: 'a3', name: 'road_network.csv', type: 'data', size: '128 MB', updatedAt: '2024-08-10T09:00:00Z' },
  { id: 'a4', name: '实验结果图.png', type: 'image', size: '1.8 MB', updatedAt: '2024-08-19T16:45:00Z' },
  { id: 'a5', name: '文献综述.md', type: 'doc', size: '89 KB', updatedAt: '2024-08-12T11:15:00Z' },
  { id: 'a6', name: 'attention_module.py', type: 'code', size: '32 KB', updatedAt: '2024-08-20T08:00:00Z' },
  { id: 'a7', name: 'baseline_results.json', type: 'data', size: '5.6 MB', updatedAt: '2024-08-08T13:30:00Z' },
  { id: 'a8', name: '架构图.svg', type: 'image', size: '340 KB', updatedAt: '2024-08-05T10:00:00Z' },
]

// 计算属性
const displayTags = computed(() => {
  return project.value?.tags?.slice(0, 3) || ['图神经网络', '路径规划', '收敛性分析']
})

const displayHypotheses = computed(() => {
  const base = project.value?.hypotheses || []
  if (base.length >= 3) return base
  return [
    ...base,
    '引入多头注意力机制可提升 GNN 对路网拓扑变化的感知能力',
    '动态边权重更新策略优于静态权重在实时路径规划中的表现',
    '模型收敛速度与注意力头数量呈正相关但存在饱和点',
  ].slice(0, 3)
})

const completedTasksCount = computed(() => {
  return tasks.value.filter(t => t.status === 'done').length
})

const verifiedEvidenceCount = computed(() => {
  return evidence.value.filter(e => e.status === 'verified').length
})

const weeklyRunsCount = computed(() => {
  return projectRuns.value.filter(r => {
    const date = new Date(r.startedAt)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    return diff < 7 * 86400000
  }).length
})

const filteredAssets = computed(() => {
  if (activeAssetFilter.value === 'all') return mockAssets
  return mockAssets.filter(a => a.type === activeAssetFilter.value)
})

const filteredEvidence = computed(() => {
  if (activeEvidenceFilter.value === 'all') return evidence.value
  return evidence.value.filter(e => e.status === activeEvidenceFilter.value)
})

const activityByDay = computed(() => {
  const groups: Record<string, ActivityItem[]> = {}
  activities.value.forEach(item => {
    const date = new Date(item.time)
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  return groups
})

// 方法
function getTasksByStatus(status: string) {
  if (status === 'review') {
    // 审核中：mock 中没有 review 状态，从 in_progress 中模拟部分
    return tasks.value.filter(t => t.status === 'in_progress').slice(0, 1)
  }
  return tasks.value.filter(t => t.status === status)
}

function memberColor(id: string): string {
  const colors = ['purple', 'blue', 'green', 'amber']
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function isOnline(id: string): boolean {
  // 简单模拟：前两个成员在线
  const idx = members.value.findIndex(m => m.id === id)
  return idx < 2
}

function activityClass(type: string): string {
  const map: Record<string, string> = {
    verify: 'success',
    literature: 'info',
    lean_build: 'brand',
    analysis: 'warning',
    review: 'warning',
    evidence: 'success',
  }
  return map[type] || 'brand'
}

function priorityText(priority: string): string {
  const map: Record<string, string> = { high: '高优先级', medium: '中优先级', low: '低优先级' }
  return map[priority] || priority
}

function priorityTagClass(priority: string): string {
  const map: Record<string, string> = {
    high: 'rs-tag-error',
    medium: 'rs-tag-warning',
    low: 'rs-tag-brand',
  }
  return map[priority] || 'rs-tag-brand'
}

function evidenceTypeText(type: string): string {
  const map: Record<string, string> = {
    derivation: '推导',
    theorem: '定理',
    numerical: '数值',
    literature: '文献',
    experiment: '实验',
  }
  return map[type] || type
}

function evidenceStatusText(status: string): string {
  const map: Record<string, string> = {
    verified: '已验证',
    pending: '待验证',
    rejected: '已驳回',
  }
  return map[status] || status
}

function runTypeText(type: string): string {
  const map: Record<string, string> = {
    verify: '数学验证',
    lean_build: 'Lean 构建',
    compile: '论文编译',
    analysis: '教育分析',
    review: '论文初审',
  }
  return map[type] || type
}

function runStatusText(status: string): string {
  const map: Record<string, string> = {
    running: '运行中',
    success: '成功',
    failed: '失败',
    cancelled: '已取消',
    queued: '排队中',
  }
  return map[status] || status
}

function runStatusTagClass(status: string): string {
  const map: Record<string, string> = {
    running: 'rs-tag-brand rs-tag-dot',
    success: 'rs-tag-success rs-tag-dot',
    failed: 'rs-tag-error rs-tag-dot',
    cancelled: 'rs-tag-warning rs-tag-dot',
    queued: 'rs-tag-info rs-tag-dot',
  }
  return map[status] || 'rs-tag-brand'
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function formatTimeOfDay(isoString: string): string {
  const date = new Date(isoString)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 1) return `${secs}s`
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hours}h ${remainMins}m`
}

// 交互处理
function onNewTask() {
  toastStore.info('新建任务功能开发中')
}

function onInviteMember() {
  toastStore.info('邀请成员功能开发中')
}

function onProjectSettings() {
  toastStore.info('项目设置功能开发中')
}

function onManageMembers() {
  toastStore.info('成员管理功能开发中')
}

function onTaskClick(task: ProjectTask) {
  toastStore.info(`任务详情：${task.title}`)
}

function onAssetClick(asset: typeof mockAssets[0]) {
  toastStore.info(`打开文件：${asset.name}`)
}

function onEvidenceClick(item: EvidenceItem) {
  toastStore.info(`跳转到证据：${item.title}`)
}

function onRunClick(run: ResearchRun) {
  toastStore.info(`运行详情：${run.title}`)
}

// 数据加载
async function loadProjectData() {
  loading.value = true
  try {
    const projectId = (route.query.id as string) || 'proj-gnn'

    const [projData, membersData, tasksData, evidenceData, activityData, runsData] =
      await Promise.all([
        researchProjectApi.detail(projectId),
        researchProjectApi.members(projectId),
        researchProjectApi.tasks(projectId),
        researchProjectApi.evidence(projectId),
        researchProjectApi.activity(projectId),
        researchRunsApi.list({ projectId }),
      ])

    project.value = projData as ResearchProject
    members.value = membersData as ProjectMember[]
    tasks.value = tasksData as ProjectTask[]
    evidence.value = evidenceData as EvidenceItem[]
    activities.value = activityData as ActivityItem[]
    projectRuns.value = (runsData as { items: ResearchRun[] }).items || []
  } catch (e) {
    console.error('Failed to load project data:', e)
    toastStore.error('加载项目数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProjectData()
})
</script>

<style scoped>
/* ---------- 页面根容器 ---------- */
.rs-project-page {
  min-height: 100%;
}

/* ---------- 加载态 ---------- */
.rs-project-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  color: var(--rs-text-muted);
}

.rs-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--rs-border-default);
  border-top-color: var(--rs-brand-400);
  border-radius: 50%;
  animation: rs-spin 0.8s linear infinite;
}

@keyframes rs-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 项目头部 ---------- */
.rs-project-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding: 20px;
  background: var(--rs-bg-surface);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
}

.rs-project-header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.rs-project-symbol {
  width: 56px;
  height: 56px;
  border-radius: var(--rs-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  flex-shrink: 0;
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.rs-project-symbol.lg {
  width: 64px;
  height: 64px;
  font-size: 28px;
}

.rs-project-symbol.purple {
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.rs-project-head-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rs-project-head-info h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--rs-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.3;
  margin: 0;
}

.rs-project-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.rs-project-desc {
  font-size: 13px;
  color: var(--rs-text-secondary);
  line-height: 1.6;
  max-width: 560px;
  margin: 0;
}

.rs-project-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
  flex-shrink: 0;
}

.rs-project-stats {
  display: flex;
  gap: 24px;
}

.rs-project-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rs-project-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--rs-text-primary);
  line-height: 1.2;
}

.rs-project-stat-label {
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-project-actions {
  display: flex;
  gap: 8px;
}

/* ---------- Tab 内容区 ---------- */
.rs-tab-content {
  margin-top: 16px;
  animation: rs-fade-in var(--rs-transition-base);
}

@keyframes rs-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.rs-tab-pane {
  display: block;
}

/* ---------- 双栏布局 ---------- */
.rs-g2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.rs-g2-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ---------- 核心研究问题 ---------- */
.rs-research-question {
  font-size: 15px;
  font-weight: 500;
  color: var(--rs-text-primary);
  line-height: 1.6;
  padding: 12px 14px;
  background: var(--rs-brand-500-soft);
  border-left: 3px solid var(--rs-brand-400);
  border-radius: 0 var(--rs-radius-md) var(--rs-radius-md) 0;
}

.rs-hypotheses {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-hypothesis-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--rs-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 2px;
}

.rs-hypothesis-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--rs-bg-surface-2);
  border-radius: var(--rs-radius-md);
  transition: background var(--rs-transition-fast);
}

.rs-hypothesis-item:hover {
  background: var(--rs-bg-surface-3);
}

.rs-hypothesis-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  background: var(--rs-bg-surface-3);
  color: var(--rs-text-muted);
}

.rs-hypothesis-check svg {
  width: 12px;
  height: 12px;
}

.rs-hypothesis-check.verified {
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

.rs-hypothesis-text {
  flex: 1;
  font-size: 13px;
  color: var(--rs-text-primary);
  line-height: 1.5;
}

.rs-hypothesis-status {
  flex-shrink: 0;
}

/* ---------- 项目成员 ---------- */
.rs-panel-body.rs-p-0 {
  padding: 0;
}

.rs-member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--rs-border-subtle);
  transition: background var(--rs-transition-fast);
}

.rs-member-row:last-child {
  border-bottom: none;
}

.rs-member-row:hover {
  background: var(--rs-bg-surface-2);
}

.rs-member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-inverse);
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--rs-brand-400), var(--rs-brand-600));
}

.rs-member-avatar.purple {
  background: linear-gradient(135deg, #a78bfa, #7c3aed);
}

.rs-member-avatar.blue {
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
}

.rs-member-avatar.green {
  background: linear-gradient(135deg, #34d399, #10b981);
}

.rs-member-avatar.amber {
  background: linear-gradient(135deg, var(--rs-brand-400), var(--rs-brand-600));
}

.rs-member-info {
  flex: 1;
  min-width: 0;
}

.rs-member-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--rs-text-primary);
}

.rs-member-role {
  font-size: 12px;
  color: var(--rs-text-muted);
  margin-top: 2px;
}

.rs-member-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rs-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--rs-text-muted);
}

.rs-status-dot.online {
  background: var(--rs-success);
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.4);
}

.rs-status-text {
  font-size: 11px;
  color: var(--rs-text-muted);
}

/* ---------- 概览统计网格 ---------- */
.rs-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.rs-stat-card {
  padding: 14px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rs-stat-card-label {
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-stat-card-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--rs-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.rs-stat-card-total {
  font-size: 14px;
  font-weight: 500;
  color: var(--rs-text-muted);
}

.rs-stat-card-unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--rs-text-muted);
  margin-left: 2px;
}

/* ---------- 资产筛选 ---------- */
.rs-asset-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.rs-asset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.rs-asset-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
}

.rs-asset-card:hover {
  background: var(--rs-bg-surface-3);
  border-color: var(--rs-border-default);
  transform: translateY(-1px);
  box-shadow: var(--rs-shadow-sm);
}

.rs-asset-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rs-asset-icon svg {
  width: 20px;
  height: 20px;
}

.rs-asset-icon.doc {
  background: var(--rs-info-bg);
  color: var(--rs-info);
}

.rs-asset-icon.code {
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.rs-asset-icon.data {
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

.rs-asset-icon.image {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
}

.rs-asset-info {
  flex: 1;
  min-width: 0;
}

.rs-asset-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--rs-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.rs-asset-meta {
  font-size: 11px;
  color: var(--rs-text-muted);
  display: flex;
  gap: 6px;
}

/* ---------- 证据筛选 ---------- */
.rs-evidence-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.rs-evidence-list-full {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rs-evidence-item-full {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
}

.rs-evidence-item-full:hover {
  background: var(--rs-bg-surface-3);
  border-color: var(--rs-border-default);
}

.rs-evidence-item-type-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--rs-text-muted);
}

.rs-evidence-item-type-tag.derivation { color: var(--rs-brand-400); }
.rs-evidence-item-type-tag.theorem { color: #a78bfa; }
.rs-evidence-item-type-tag.numerical { color: var(--rs-success); }
.rs-evidence-item-type-tag.literature { color: var(--rs-info); }
.rs-evidence-item-type-tag.experiment { color: var(--rs-warning); }

.rs-evidence-item-title-full {
  font-size: 14px;
  font-weight: 500;
  color: var(--rs-text-primary);
  line-height: 1.4;
}

.rs-evidence-item-meta-full {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-evidence-source {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rs-evidence-source svg {
  width: 14px;
  height: 14px;
}

.rs-evidence-time {
  flex: 1;
}

.rs-evidence-status-badge {
  padding: 2px 8px;
  border-radius: var(--rs-radius-full);
  font-size: 11px;
  font-weight: 500;
}

.rs-evidence-status-badge.verified {
  background: var(--rs-success-bg);
  color: var(--rs-success);
  border: 1px solid var(--rs-success-border);
}

.rs-evidence-status-badge.pending {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
  border: 1px solid var(--rs-warning-border);
}

.rs-evidence-status-badge.rejected {
  background: var(--rs-error-bg);
  color: var(--rs-error);
  border: 1px solid var(--rs-error-border);
}

/* ---------- 运行列表头部 ---------- */
.rs-run-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--rs-border-subtle);
}

/* ---------- 动态按天分组 ---------- */
.rs-activity-day-group {
  margin-bottom: 24px;
}

.rs-activity-day-group:last-child {
  margin-bottom: 0;
}

.rs-activity-day-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--rs-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rs-border-subtle);
}

/* ---------- 看板卡片拖拽把手 ---------- */
.rs-kanban-card-drag {
  display: flex;
  justify-content: flex-end;
  color: var(--rs-text-dim);
  margin-bottom: 4px;
  cursor: grab;
  opacity: 0;
  transition: opacity var(--rs-transition-fast);
}

.rs-kanban-card:hover .rs-kanban-card-drag {
  opacity: 1;
}

.rs-kanban-card-drag svg {
  width: 14px;
  height: 14px;
}

.rs-kanban-card-drag:active {
  cursor: grabbing;
}

/* ---------- 看板卡片日期 ---------- */
.rs-kanban-card-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--rs-text-muted);
}

.rs-kanban-card-date svg {
  width: 12px;
  height: 12px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1280px) {
  .rs-g2 {
    grid-template-columns: 1fr;
  }

  .rs-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .rs-asset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
