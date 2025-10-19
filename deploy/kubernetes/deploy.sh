#!/bin/bash
# 基于MediaCrawler增强的微博爬取系统 - Kubernetes部署脚本
# Weibo Crawler System - Kubernetes Deployment Script

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl 未安装，请先安装 kubectl"
        exit 1
    fi

    if ! command -v helm &> /dev/null; then
        log_warning "helm 未安装，某些功能可能不可用"
    fi

    # 检查集群连接
    if ! kubectl cluster-info &> /dev/null; then
        log_error "无法连接到 Kubernetes 集群"
        exit 1
    fi

    log_success "依赖检查完成"
}

# 创建命名空间
create_namespace() {
    log_info "创建命名空间..."
    kubectl apply -f namespace.yaml
    log_success "命名空间创建完成"
}

# 应用配置
apply_configmaps() {
    log_info "应用配置文件..."
    kubectl apply -f configmaps.yaml
    log_success "配置文件应用完成"
}

# 应用密钥
apply_secrets() {
    log_info "应用密钥配置..."

    # 检查是否需要更新密钥
    if kubectl get secret crawler-secrets -n weibo-crawler &> /dev/null; then
        log_warning "密钥已存在，跳过创建。如需更新请手动编辑 secrets.yaml"
    else
        kubectl apply -f secrets.yaml
        log_success "密钥配置应用完成"
    fi
}

# 创建存储
create_storage() {
    log_info "创建持久化存储..."
    kubectl apply -f pvc.yaml
    log_success "持久化存储创建完成"
}

# 部署有状态服务
deploy_stateful_services() {
    log_info "部署有状态服务..."
    kubectl apply -f statefulsets.yaml

    # 等待服务就绪
    log_info "等待有状态服务就绪..."
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=postgres -n weibo-crawler --timeout=300s
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=mongodb -n weibo-crawler --timeout=300s
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=redis -n weibo-crawler --timeout=300s
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=rabbitmq -n weibo-crawler --timeout=300s
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=minio -n weibo-crawler --timeout=300s

    log_success "有状态服务部署完成"
}

# 部署无状态服务
deploy_stateless_services() {
    log_info "部署无状态服务..."
    kubectl apply -f deployments.yaml

    # 等待服务就绪
    log_info "等待无状态服务就绪..."
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=crawler -n weibo-crawler --timeout=600s
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=nginx -n weibo-crawler --timeout=300s
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=prometheus -n weibo-crawler --timeout=300s
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=grafana -n weibo-crawler --timeout=300s
    kubectl wait --for=condition=ready pod -l app=weibo-crawler,component=alertmanager -n weibo-crawler --timeout=300s

    log_success "无状态服务部署完成"
}

# 创建服务
create_services() {
    log_info "创建服务..."
    kubectl apply -f services.yaml
    log_success "服务创建完成"
}

# 配置RBAC
configure_rbac() {
    log_info "配置RBAC..."
    kubectl apply -f rbac.yaml
    log_success "RBAC配置完成"
}

# 配置自动扩缩容
configure_autoscaling() {
    log_info "配置自动扩缩容..."
    kubectl apply -f autoscaling.yaml
    log_success "自动扩缩容配置完成"
}

# 配置Ingress
configure_ingress() {
    log_info "配置Ingress..."
    kubectl apply -f ingress.yaml
    log_success "Ingress配置完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署状态..."

    echo ""
    log_info "Pods 状态:"
    kubectl get pods -n weibo-crawler -o wide

    echo ""
    log_info "服务状态:"
    kubectl get services -n weibo-crawler

    echo ""
    log_info "持久化存储状态:"
    kubectl get pvc -n weibo-crawler

    echo ""
    log_info "Ingress状态:"
    kubectl get ingress -n weibo-crawler

    echo ""
    log_info "HPA状态:"
    kubectl get hpa -n weibo-crawler
}

# 显示访问信息
show_access_info() {
    log_info "获取访问信息..."

    # 获取外部IP
    NGINX_IP=$(kubectl get service nginx-service -n weibo-crawler -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

    echo ""
    log_success "部署完成！"
    echo ""
    echo "=== 访问信息 ==="
    echo "主应用: http://$NGINX_IP"
    echo "Grafana: http://$NGINX_IP:3001 (如果配置了LoadBalancer)"
    echo ""
    echo "=== 内部访问 ==="
    echo "Prometheus: http://prometheus-service:9090"
    echo "Grafana: http://grafana-service:3000"
    echo "AlertManager: http://alertmanager-service:9093"
    echo "RabbitMQ管理: http://rabbitmq-service:15672"
    echo "MinIO控制台: http://minio-service:9001"
    echo ""
    echo "=== 查看日志 ==="
    echo "Crawler日志: kubectl logs -f deployment/crawler -n weibo-crawler"
    echo "Nginx日志: kubectl logs -f deployment/nginx -n weibo-crawler"
    echo ""
    echo "=== 监控命令 ==="
    echo "查看Pod状态: kubectl get pods -n weibo-crawler -w"
    echo "查看资源使用: kubectl top pods -n weibo-crawler"
    echo "查看事件: kubectl get events -n weibo-crawler --sort-by='.lastTimestamp'"
}

# 清理函数
cleanup() {
    log_warning "开始清理..."
    kubectl delete namespace weibo-crawler --ignore-not-found=true
    log_success "清理完成"
}

# 主函数
main() {
    echo "=================================="
    echo "  微博爬取系统 - Kubernetes部署"
    echo "  基于 MediaCrawler 增强"
    echo "=================================="
    echo ""

    # 解析命令行参数
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            create_namespace
            apply_configmaps
            apply_secrets
            create_storage
            configure_rbac
            deploy_stateful_services
            create_services
            deploy_stateless_services
            configure_autoscaling
            configure_ingress
            verify_deployment
            show_access_info
            ;;
        "cleanup")
            cleanup
            ;;
        "verify")
            verify_deployment
            ;;
        "logs")
            kubectl logs -f deployment/crawler -n weibo-crawler
            ;;
        "status")
            kubectl get all -n weibo-crawler
            ;;
        *)
            echo "用法: $0 {deploy|cleanup|verify|logs|status}"
            echo ""
            echo "  deploy  - 完整部署系统"
            echo "  cleanup - 清理所有资源"
            echo "  verify  - 验证部署状态"
            echo "  logs    - 查看Crawler日志"
            echo "  status  - 查看所有资源状态"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"