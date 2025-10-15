import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import {
  Globe,
  Users,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Star,
  Building,
} from 'lucide-react';

interface UserGroupData {
  userType: string;
  userCount: number;
  postCount: number;
  influence: number;
  avgFollowers?: number;
  engagement?: number;
  icon?: string;
  color?: string;
}

interface PropagationPathChartProps {
  data: UserGroupData[];
  className?: string;
}

const PropagationPathChart: React.FC<PropagationPathChartProps> = ({ 
  data, 
  className = '' 
}) => {
  // 按影响力排序
  const sortedData = [...data].sort((a, b) => b.influence - a.influence);
  
  const getUserTypeIcon = (userType: string) => {
    switch (userType.toLowerCase()) {
      case '普通用户':
      case '个人用户':
        return <Users className="w-6 h-6" />;
      case '认证用户':
      case '蓝v用户':
        return <CheckCircle className="w-6 h-6" />;
      case '媒体用户':
      case '官方媒体':
        return <Globe className="w-6 h-6" />;
      case 'kol用户':
      case '意见领袖':
        return <Star className="w-6 h-6" />;
      case '企业用户':
      case '机构用户':
        return <Building className="w-6 h-6" />;
      default:
        return <Users className="w-6 h-6" />;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType.toLowerCase()) {
      case '普通用户':
      case '个人用户':
        return 'from-blue-500 to-blue-600';
      case '认证用户':
      case '蓝v用户':
        return 'from-green-500 to-green-600';
      case '媒体用户':
      case '官方媒体':
        return 'from-red-500 to-red-600';
      case 'kol用户':
      case '意见领袖':
        return 'from-purple-500 to-purple-600';
      case '企业用户':
      case '机构用户':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };


  return (
    <div className={cn('space-y-6', className)}>

      {/* 详细数据表格 */}
      <div className="bg-muted/20 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          用户传播数据
        </h4>
        
        <div className="space-y-4">
          {sortedData.map((userGroup, index) => (
            <motion.div
              key={userGroup.userType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card/50 rounded-lg p-4 border border-border/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white',
                    getUserTypeColor(userGroup.userType)
                  )}>
                    {getUserTypeIcon(userGroup.userType)}
                  </div>
                  <div>
                    <h5 className="font-semibold text-foreground">{userGroup.userType}</h5>
                    <p className="text-sm text-muted-foreground">
                      排名 #{index + 1} · 活跃度 {userGroup.influence}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <div className="flex items-center space-x-1 text-muted-foreground mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">用户数量</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {userGroup.userCount.toLocaleString()}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center space-x-1 text-muted-foreground mb-1">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs">发帖数量</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {userGroup.postCount.toLocaleString()}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">人均发帖</div>
                    <div className="text-lg font-bold text-primary">
                      {(userGroup.postCount / userGroup.userCount).toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 用户活跃度条 */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>用户活跃度</span>
                  <span>{userGroup.influence}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${userGroup.influence}%` }}
                    transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
                    className={cn(
                      'h-full bg-gradient-to-r',
                      getUserTypeColor(userGroup.userType)
                    )}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 用户传播分析 */}
      <div className="bg-muted/20 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          用户传播分析
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-card/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {sortedData.reduce((sum, p) => sum + p.userCount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">总参与用户</div>
          </div>

          <div className="text-center p-4 bg-card/50 rounded-lg">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {sortedData.reduce((sum, p) => sum + p.postCount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">用户贴子总数</div>
          </div>

          <div className="text-center p-4 bg-card/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {(sortedData.reduce((sum, p) => sum + p.postCount, 0) / sortedData.reduce((sum, p) => sum + p.userCount, 0)).toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">人均发贴数</div>
          </div>

          <div className="text-center p-4 bg-card/50 rounded-lg">
            <div className="text-2xl font-bold text-orange-400 mb-1">
              {Math.round(sortedData.reduce((sum, p) => sum + p.influence, 0) / sortedData.length)}
            </div>
            <div className="text-sm text-muted-foreground">平均活跃度</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropagationPathChart;
