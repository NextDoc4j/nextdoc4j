/*
 * Copyright (c) 2025-present echo. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of the NextDoc4j project.
 */
package top.nextdoc4j.plugin.gateway.model;

import java.io.Serial;
import java.io.Serializable;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gateway 路由定义。
 *
 * @author echo
 * @since 1.2.1
 */
public class GatewayRouteDefinition implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String id;

    private URI uri;

    private Map<String, Object> metadata = new LinkedHashMap<>();

    private List<GatewayPredicateDefinition> predicates = new ArrayList<>();

    private List<GatewayFilterDefinition> filters = new ArrayList<>();

    public GatewayRouteDefinition() {
    }

    public GatewayRouteDefinition(String id,
                                  URI uri,
                                  Map<String, Object> metadata,
                                  List<GatewayPredicateDefinition> predicates) {
        this.id = id;
        this.uri = uri;
        setMetadata(metadata);
        setPredicates(predicates);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public URI getUri() {
        return uri;
    }

    public void setUri(URI uri) {
        this.uri = uri;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata == null ? new LinkedHashMap<>() : new LinkedHashMap<>(metadata);
    }

    public List<GatewayPredicateDefinition> getPredicates() {
        return predicates;
    }

    public void setPredicates(List<GatewayPredicateDefinition> predicates) {
        this.predicates = predicates == null ? new ArrayList<>() : new ArrayList<>(predicates);
    }

    public List<GatewayFilterDefinition> getFilters() {
        return filters;
    }

    public void setFilters(List<GatewayFilterDefinition> filters) {
        this.filters = filters == null ? new ArrayList<>() : new ArrayList<>(filters);
    }
}
