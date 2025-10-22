BEGIN;

CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS weibo_interactions CASCADE;
DROP TABLE IF EXISTS weibo_user_stats CASCADE;
DROP TABLE IF EXISTS weibo_posts_mentions CASCADE;
DROP TABLE IF EXISTS weibo_posts_hashtags CASCADE;
DROP TABLE IF EXISTS weibo_media CASCADE;
DROP TABLE IF EXISTS weibo_comments CASCADE;
DROP TABLE IF EXISTS weibo_posts CASCADE;
DROP TABLE IF EXISTS weibo_hashtags CASCADE;
DROP TABLE IF EXISTS weibo_users CASCADE;

DROP TYPE IF EXISTS weibo_visible_type_enum;
DROP TYPE IF EXISTS weibo_interaction_type_enum;
DROP TYPE IF EXISTS weibo_target_type_enum;
DROP TYPE IF EXISTS weibo_media_type_enum;

CREATE TYPE weibo_visible_type_enum AS ENUM ('public', 'fans', 'group', 'private', 'custom');
CREATE TYPE weibo_interaction_type_enum AS ENUM ('like', 'repost', 'comment', 'favorite');
CREATE TYPE weibo_target_type_enum AS ENUM ('post', 'comment');
CREATE TYPE weibo_media_type_enum AS ENUM ('image', 'video', 'audio', 'article', 'unknown');

CREATE TABLE weibo_users (
    id                  BIGSERIAL PRIMARY KEY,
    weibo_id            NUMERIC(20, 0) NOT NULL UNIQUE,
    idstr               VARCHAR(32) NOT NULL,
    screen_name         VARCHAR(64) NOT NULL,
    domain              VARCHAR(64),
    weihao              VARCHAR(64),
    verified            BOOLEAN DEFAULT FALSE,
    verified_type       SMALLINT,
    verified_reason     TEXT,
    verified_type_ext   INTEGER,
    profile_image_url   TEXT,
    avatar_large        TEXT,
    avatar_hd           TEXT,
    followers_count     INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
    friends_count       INTEGER NOT NULL DEFAULT 0 CHECK (friends_count >= 0),
    statuses_count      INTEGER NOT NULL DEFAULT 0 CHECK (statuses_count >= 0),
    mbrank              SMALLINT,
    mbtype              SMALLINT,
    v_plus              BOOLEAN DEFAULT FALSE,
    svip                BOOLEAN DEFAULT FALSE,
    vvip                BOOLEAN DEFAULT FALSE,
    user_ability        INTEGER[],
    planet_video        BOOLEAN DEFAULT FALSE,
    gender              CHAR(1) CHECK (gender IN ('m', 'f', 'n')),
    location            VARCHAR(128),
    description         TEXT,
    follow_me           BOOLEAN DEFAULT FALSE,
    following           BOOLEAN DEFAULT FALSE,
    online_status       SMALLINT,
    raw_payload         JSONB NOT NULL,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE weibo_posts (
    id                  BIGSERIAL PRIMARY KEY,
    weibo_id            NUMERIC(20, 0) NOT NULL UNIQUE,
    mid                 VARCHAR(64) NOT NULL UNIQUE,
    mblogid             VARCHAR(64) NOT NULL UNIQUE,
    author_id           BIGINT NOT NULL REFERENCES weibo_users(id),
    author_weibo_id     NUMERIC(20, 0) NOT NULL,
    author_nickname     VARCHAR(64),
    author_avatar       TEXT,
    author_verified_info TEXT,
    text                TEXT NOT NULL,
    text_raw            TEXT,
    text_length         INTEGER NOT NULL DEFAULT 0 CHECK (text_length >= 0),
    is_long_text        BOOLEAN NOT NULL DEFAULT FALSE,
    content_auth        VARCHAR(64),
    created_at          TIMESTAMPTZ NOT NULL,
    published_at        TIMESTAMPTZ,
    reposts_count       INTEGER NOT NULL DEFAULT 0 CHECK (reposts_count >= 0),
    comments_count      INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    attitudes_count     INTEGER NOT NULL DEFAULT 0 CHECK (attitudes_count >= 0),
    source              VARCHAR(128),
    region_name         VARCHAR(128),
    pic_num             SMALLINT CHECK (pic_num >= 0),
    is_paid             BOOLEAN NOT NULL DEFAULT FALSE,
    mblog_vip_type      SMALLINT,
    can_edit            BOOLEAN NOT NULL DEFAULT FALSE,
    favorited           BOOLEAN NOT NULL DEFAULT FALSE,
    mblogtype           SMALLINT NOT NULL,
    is_repost           BOOLEAN NOT NULL DEFAULT FALSE,
    share_repost_type   SMALLINT,
    visible_type        weibo_visible_type_enum,
    visible_list_id     NUMERIC(20, 0),
    location_json       JSONB,
    page_info_json      JSONB,
    action_log_json     JSONB,
    analysis_extra      JSONB,
    raw_payload         JSONB NOT NULL,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_weibo_posts_created_at ON weibo_posts (created_at DESC);
CREATE INDEX idx_weibo_posts_author ON weibo_posts (author_weibo_id, created_at DESC);
CREATE INDEX idx_weibo_posts_type_created ON weibo_posts (mblogtype, created_at DESC);
CREATE INDEX idx_weibo_posts_text_trgm ON weibo_posts USING GIN (text_raw gin_trgm_ops);

CREATE TABLE weibo_media (
    id              BIGSERIAL PRIMARY KEY,
    post_id         BIGINT NOT NULL REFERENCES weibo_posts(id) ON DELETE CASCADE,
    media_id        VARCHAR(128) NOT NULL,
    media_type      weibo_media_type_enum NOT NULL,
    file_url        TEXT NOT NULL,
    original_url    TEXT,
    width           INTEGER CHECK (width > 0),
    height          INTEGER CHECK (height > 0),
    file_size       INTEGER CHECK (file_size >= 0),
    format          VARCHAR(32),
    thumbnail       TEXT,
    bmiddle         TEXT,
    large           TEXT,
    original        TEXT,
    duration        INTEGER CHECK (duration >= 0),
    stream_url      TEXT,
    stream_url_hd   TEXT,
    media_info_json JSONB,
    raw_payload     JSONB NOT NULL,
    UNIQUE (post_id, media_id)
);

CREATE INDEX idx_weibo_media_post_type ON weibo_media (post_id, media_type);

CREATE TABLE weibo_hashtags (
    id              BIGSERIAL PRIMARY KEY,
    tag_id          VARCHAR(128) NOT NULL UNIQUE,
    tag_name        VARCHAR(128) NOT NULL,
    tag_type        SMALLINT,
    tag_hidden      BOOLEAN NOT NULL DEFAULT FALSE,
    oid             VARCHAR(128),
    tag_scheme      TEXT,
    description     TEXT,
    url_type_pic    TEXT,
    w_h_ratio       NUMERIC(6, 3),
    action_log_json JSONB,
    raw_payload     JSONB NOT NULL,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weibo_hashtags_name ON weibo_hashtags (tag_name);

CREATE TABLE weibo_posts_hashtags (
    post_id     BIGINT NOT NULL REFERENCES weibo_posts(id) ON DELETE CASCADE,
    hashtag_id  BIGINT NOT NULL REFERENCES weibo_hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);

CREATE TABLE weibo_posts_mentions (
    post_id      BIGINT NOT NULL REFERENCES weibo_posts(id) ON DELETE CASCADE,
    mentioned_id BIGINT NOT NULL REFERENCES weibo_users(id),
    PRIMARY KEY (post_id, mentioned_id)
);

CREATE TABLE weibo_comments (
    id                  BIGSERIAL PRIMARY KEY,
    comment_id          NUMERIC(20, 0) NOT NULL UNIQUE,
    idstr               VARCHAR(64) NOT NULL,
    mid                 VARCHAR(64) NOT NULL UNIQUE,
    root_id             NUMERIC(20, 0),
    root_mid            VARCHAR(64),
    post_id             BIGINT NOT NULL REFERENCES weibo_posts(id) ON DELETE CASCADE,
    author_id           BIGINT NOT NULL REFERENCES weibo_users(id),
    author_weibo_id     NUMERIC(20, 0) NOT NULL,
    author_nickname     VARCHAR(64),
    text                TEXT NOT NULL,
    text_raw            TEXT,
    source              VARCHAR(128),
    floor_number        INTEGER,
    created_at          TIMESTAMPTZ NOT NULL,
    like_counts         INTEGER NOT NULL DEFAULT 0 CHECK (like_counts >= 0),
    liked               BOOLEAN NOT NULL DEFAULT FALSE,
    total_number        INTEGER CHECK (total_number >= 0),
    disable_reply       BOOLEAN NOT NULL DEFAULT FALSE,
    restrict_operate    BOOLEAN NOT NULL DEFAULT FALSE,
    allow_follow        BOOLEAN NOT NULL DEFAULT TRUE,
    reply_comment_id    NUMERIC(20, 0),
    reply_original_text TEXT,
    is_mblog_author     BOOLEAN NOT NULL DEFAULT FALSE,
    comment_badge       JSONB,
    path                LTREE NOT NULL,
    raw_payload         JSONB NOT NULL,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weibo_comments_post_path ON weibo_comments (post_id, path);
CREATE INDEX idx_weibo_comments_created ON weibo_comments (created_at DESC);

CREATE TABLE weibo_interactions (
    id                  BIGSERIAL PRIMARY KEY,
    interaction_type    weibo_interaction_type_enum NOT NULL,
    user_id             BIGINT REFERENCES weibo_users(id),
    user_weibo_id       NUMERIC(20, 0),
    user_info_snapshot  JSONB NOT NULL,
    target_type         weibo_target_type_enum NOT NULL,
    target_post_id      BIGINT REFERENCES weibo_posts(id) ON DELETE CASCADE,
    target_comment_id   BIGINT REFERENCES weibo_comments(id) ON DELETE CASCADE,
    target_weibo_id     NUMERIC(20, 0) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attitude_value      SMALLINT,
    metadata_json       JSONB,
    raw_payload         JSONB NOT NULL,
    CONSTRAINT chk_weibo_interactions_target CHECK (
        (target_type = 'post' AND target_post_id IS NOT NULL AND target_comment_id IS NULL)
        OR
        (target_type = 'comment' AND target_comment_id IS NOT NULL)
    )
);

CREATE INDEX idx_weibo_interactions_user ON weibo_interactions (interaction_type, user_weibo_id, created_at DESC);

CREATE TABLE weibo_user_stats (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES weibo_users(id) ON DELETE CASCADE,
    snapshot_time   TIMESTAMPTZ NOT NULL,
    followers       INTEGER CHECK (followers >= 0),
    following       INTEGER CHECK (following >= 0),
    statuses        INTEGER CHECK (statuses >= 0),
    likes           INTEGER CHECK (likes >= 0),
    data_source     VARCHAR(64) NOT NULL,
    raw_payload     JSONB NOT NULL,
    version_tag     VARCHAR(64),
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, snapshot_time)
);

COMMIT;
