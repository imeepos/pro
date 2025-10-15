import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users,
  Search,
  AlertTriangle,
  Shield,
  Eye,
  UserCheck,
  Activity,
  MessageSquare,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@/utils/logger';
import { UserProfile } from '@/types';
import { UsersAPI } from '@/services/api';


const logger = createLogger('UserDetection');

const UserDetection: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [riskLevels, setRiskLevels] = useState<string[]>([]);
  const [riskLevelLabels, setRiskLevelLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersResult, riskLevelsResult] = await Promise.all([
          UsersAPI.getUsersList(),
          UsersAPI.getRiskLevels()
        ]);
        
        // 转换用户数据格式
        const users = Array.isArray(usersResult) ? usersResult : 
                     (usersResult && usersResult.users) ? usersResult.users : [];
        setUsers(users);
        // 转换风险等级数据
        const riskLevelNames = ['all', ...(riskLevelsResult || []).map(level => level.level)];
        setRiskLevels(riskLevelNames);
        const riskLabels: Record<string, string> = { all: '全部' };
        (riskLevelsResult || []).forEach(level => {
          riskLabels[level.level] = level.name;
        });
        setRiskLevelLabels(riskLabels);
      } catch (error) {
        logger.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = selectedRiskLevel === 'all' || user.riskLevel === selectedRiskLevel;
    return matchesSearch && matchesRisk;
  });

  const getRiskColor = (level: UserProfile['riskLevel']) => {
    switch (level) {
      case 'high':
        return 'text-red-400 bg-red-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'low':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getRiskIcon = (level: UserProfile['riskLevel']) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Eye className="w-4 h-4" />;
      case 'low':
        return <Shield className="w-4 h-4" />;
      default:
        return <UserCheck className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和搜索 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">用户检测面板</h1>
          <p className="text-muted-foreground mt-1">
            当前时间区间: {selectedTimeRange} | 用户行为监测与风险分析
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索用户名或昵称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* 风险等级筛选 */}
          <select
            value={selectedRiskLevel}
            onChange={(e) => setSelectedRiskLevel(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {riskLevels.map(level => (
              <option key={level} value={level} className="bg-card text-foreground">
                {riskLevelLabels[level as keyof typeof riskLevelLabels]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{formatNumber((users || []).length)}</div>
              <div className="text-sm text-muted-foreground">总用户数</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber((users || []).filter(u => u.riskLevel === 'high').length)}
              </div>
              <div className="text-sm text-muted-foreground">高风险用户</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber((users || []).filter(u => u.riskLevel === 'medium').length)}
              </div>
              <div className="text-sm text-muted-foreground">中风险用户</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber((users || []).filter(u => u.riskLevel === 'low').length)}
              </div>
              <div className="text-sm text-muted-foreground">低风险用户</div>
            </div>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 hover:bg-card/90 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedUser(user)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {/* 用户头像 */}
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-foreground">{user.nickname}</h3>
                    <span className="text-muted-foreground">@{user.username}</span>
                    {user.verified && (
                      <UserCheck className="w-4 h-4 text-blue-400" />
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                    <span>{formatNumber(user.followers)} 粉丝</span>
                    <span>{formatNumber(user.following)} 关注</span>
                    <span>{formatNumber(user.posts)} 贴子</span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{user.location}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{user.activities.posts}</span>
                      <span className="text-muted-foreground">发布</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{user.activities.comments}</span>
                      <span className="text-muted-foreground">评论</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{formatRelativeTime(user.lastActive)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {user.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                {/* 风险等级 */}
                <div className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                  getRiskColor(user.riskLevel)
                )}>
                  {getRiskIcon(user.riskLevel)}
                  <span>{riskLevelLabels[user.riskLevel]}</span>
                </div>
                
                {/* 情感倾向 */}
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">情感倾向</div>
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-success">{user.sentiment.positive}%</span>
                    <span className="text-destructive">{user.sentiment.negative}%</span>
                    <span className="text-muted-foreground">{user.sentiment.neutral}%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          ))}
        </div>
      )}

      {/* 用户详情模态框 */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">用户详情</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">{selectedUser.nickname}</h3>
                    {selectedUser.verified && <UserCheck className="w-5 h-5 text-blue-400" />}
                  </div>
                  <p className="text-muted-foreground">@{selectedUser.username}</p>
                  <p className="text-muted-foreground">{selectedUser.location}</p>
                </div>
                <div className={cn(
                  'flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium',
                  getRiskColor(selectedUser.riskLevel)
                )}>
                  {getRiskIcon(selectedUser.riskLevel)}
                  <span>{riskLevelLabels[selectedUser.riskLevel]}</span>
                </div>
              </div>
              
              {/* 统计数据 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">粉丝数量</div>
                  <div className="text-xl font-bold text-foreground">{formatNumber(selectedUser.followers)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">关注数量</div>
                  <div className="text-xl font-bold text-foreground">{formatNumber(selectedUser.following)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">发布贴子</div>
                  <div className="text-xl font-bold text-foreground">{formatNumber(selectedUser.posts)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">活跃度</div>
                  <div className="text-xl font-bold text-foreground">
                    {formatNumber(selectedUser.activities.posts + selectedUser.activities.comments)}
                  </div>
                </div>
              </div>

              {/* 情感分析 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-3">情感分析</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-success">正面情绪</span>
                    <span className="text-foreground">{selectedUser.sentiment.positive}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-destructive">负面情绪</span>
                    <span className="text-foreground">{selectedUser.sentiment.negative}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">中性情绪</span>
                    <span className="text-foreground">{selectedUser.sentiment.neutral}%</span>
                  </div>
                </div>
              </div>

              {/* 用户标签 */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">用户标签</div>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default UserDetection;
